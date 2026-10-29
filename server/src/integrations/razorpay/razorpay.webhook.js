/**
 * Razorpay webhook processing.
 * Signature = HMAC_SHA256(raw body, webhook secret), so the route must receive the raw bytes.
 */
import { prisma, isUniqueViolation } from '../../core/database/prisma.js';
import { env } from '../../config/env.js';
import { sha256 } from '../../core/utils/tokens.js';
import { logger } from '../../core/logger/logger.js';
import { audit } from '../../core/utils/audit.js';
import { verifyWebhookSignature } from './razorpay.signature.js';
import { applyVerifiedPayment, markPaymentFailed } from '../../features/subscription/subscription.service.js';

/**
 * Razorpay webhooks: raw body required (HMAC over exact bytes). At-least-once and possibly
 * out of order, so each event is stored once (unique provider+eventId): PROCESSED/IGNORED
 * redeliveries are acknowledged without reprocessing; FAILED/RECEIVED ones are retried.
 * Handled: payment.captured, order.paid (activate/extend), payment.failed, refund.processed.
 */
async function dispatchWebhook(event) {
  const payment = event.payload?.payment?.entity;
  switch (event.event) {
    case 'payment.captured':
    case 'order.paid': {
      if (!payment?.order_id) return 'IGNORED';
      const r = await applyVerifiedPayment({ providerOrderId: payment.order_id, providerPaymentId: payment.id, amountPaise: payment.amount, currency: payment.currency, actor: 'webhook' });
      return r.applied || r.alreadyApplied ? 'PROCESSED' : 'IGNORED';
    }
    case 'payment.failed':
      if (!payment?.order_id) return 'IGNORED';
      await markPaymentFailed({ providerOrderId: payment.order_id, providerPaymentId: payment.id, reason: payment.error_description, actor: 'webhook' });
      return 'PROCESSED';
    case 'refund.processed': {
      const refund = event.payload?.refund?.entity;
      const ptx = refund?.payment_id ? await prisma.paymentTransaction.findUnique({ where: { providerPaymentId: refund.payment_id } }) : null;
      if (!ptx) return 'IGNORED';
      await prisma.paymentTransaction.update({ where: { id: ptx.id }, data: { status: 'REFUNDED' } });
      // Access is not revoked automatically on refund; a platform admin decides (audited).
      await audit(prisma, { tenantId: ptx.tenantId, actor: 'webhook' }, 'billing.refund_processed', { entityType: 'PaymentTransaction', entityId: ptx.id, detail: { refundId: refund.id, amount: refund.amount } });
      return 'PROCESSED';
    }
    default:
      return 'IGNORED';
  }
}

/** @returns {{ httpStatus:number, body:object }} */
export async function handleRazorpayWebhook({ rawBody, signature, eventIdHeader, requestId }) {
  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET })) {
    logger.warn({ requestId }, 'razorpay webhook signature invalid');
    return { httpStatus: 400, body: { error: { code: 'SIGNATURE_INVALID', message: 'Invalid signature' } } };
  }
  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); } catch { return { httpStatus: 400, body: { error: { code: 'INVALID_JSON' } } }; }
  const eventId = eventIdHeader || sha256(rawBody);

  let row;
  try {
    row = await prisma.webhookEvent.create({ data: { provider: 'razorpay', eventId, eventType: String(event.event ?? 'unknown'), payload: event } });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    row = await prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider: 'razorpay', eventId } } });
    if (['PROCESSED', 'IGNORED'].includes(row.status)) return { httpStatus: 200, body: { data: { duplicate: true } } };
  }
  try {
    const status = await dispatchWebhook(event);
    await prisma.webhookEvent.update({ where: { id: row.id }, data: { status, processedAt: new Date(), attempts: { increment: 1 }, error: null } });
    return { httpStatus: 200, body: { data: { status } } };
  } catch (err) {
    await prisma.webhookEvent.update({ where: { id: row.id }, data: { status: 'FAILED', attempts: { increment: 1 }, error: String(err.message).slice(0, 1000) } });
    logger.error({ err, eventId }, 'razorpay webhook processing failed');
    // Non-2xx → Razorpay retries; permanent business errors (4xx) are acknowledged to stop retries.
    return { httpStatus: err.status && err.status < 500 ? 200 : 500, body: { data: { status: 'FAILED' } } };
  }
}
