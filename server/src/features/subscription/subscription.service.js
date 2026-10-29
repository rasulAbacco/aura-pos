/**
 * SaaS subscription billing. Activation happens ONLY from a verified signal:
 *   (a) checkout callback with a valid HMAC signature, or
 *   (b) a signature-verified webhook (payment.captured / order.paid).
 * Whichever arrives first applies the payment; the other is a no-op (appliedAt marker,
 * claimed with a conditional UPDATE inside the same transaction).
 */
import { prisma } from '../../core/database/prisma.js';
import { dec, toPaise } from '../../core/money/money.js';
import { audit } from '../../core/utils/audit.js';
import { AppError, conflict, notFound } from '../../core/errors/errors.js';
import { nextPeriod } from './subscription.entitlements.js';
import { razorpay } from '../../integrations/razorpay/razorpay.client.js';
import { verifyPaymentSignature } from '../../integrations/razorpay/razorpay.signature.js';
import { env } from '../../config/env.js';

export async function createPlanOrder(ctx, planId) {
  if (!ctx.user.emailVerifiedAt) throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email address before purchasing a plan');
  const plan = await prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan || dec(plan.price).lessThanOrEqualTo(0)) throw notFound('Plan');

  // Downgrade guard: the new plan must fit current usage.
  const [staffCount, branchCount] = await Promise.all([
    prisma.staffProfile.count({ where: { tenantId: ctx.tenantId, status: 'ACTIVE', archivedAt: null } }),
    prisma.branch.count({ where: { tenantId: ctx.tenantId, isActive: true } }),
  ]);
  if (staffCount > plan.maxStaff || branchCount > plan.maxBranches) {
    throw conflict('PLAN_TOO_SMALL', `This plan allows ${plan.maxStaff} staff and ${plan.maxBranches} branch(es); you currently have ${staffCount} and ${branchCount}.`);
  }

  const amountPaise = toPaise(plan.price);
  const order = await razorpay.createOrder({
    amountPaise, currency: plan.currency,
    receipt: `t_${ctx.tenantId.slice(0, 8)}_${Date.now()}`,
    notes: { tenantId: ctx.tenantId, planId: plan.id },
  });
  if (order.amount !== amountPaise || order.currency !== plan.currency) throw new AppError(502, 'PAYMENT_PROVIDER_MISMATCH', 'Payment provider returned an unexpected order');

  await prisma.paymentTransaction.create({
    data: { tenantId: ctx.tenantId, planId: plan.id, providerOrderId: order.id, amount: plan.price, amountPaise, currency: plan.currency, status: 'CREATED' },
  });
  await audit(prisma, ctx, 'billing.order_created', { entityType: 'PaymentTransaction', entityId: order.id, detail: { planCode: plan.code, amountPaise } });
  return { orderId: order.id, amountPaise, currency: plan.currency, keyId: env.RAZORPAY_KEY_ID, plan: { id: plan.id, name: plan.name } };
}

/**
 * Apply a verified, captured payment to the tenant's subscription. Idempotent.
 * @returns {{applied: boolean, subscriptionId?: string}}
 */
export async function applyVerifiedPayment({ providerOrderId, providerPaymentId, amountPaise, currency, actor, tenantIdHint }) {
  return prisma.$transaction(async (tx) => {
    const ptx = await tx.paymentTransaction.findUnique({ where: { providerOrderId }, include: { plan: true } });
    if (!ptx) throw notFound('Payment order');
    if (tenantIdHint && tenantIdHint !== ptx.tenantId) throw new AppError(403, 'PAYMENT_TENANT_MISMATCH', 'Payment does not belong to this account');
    if (amountPaise !== undefined && (amountPaise !== ptx.amountPaise || currency !== ptx.currency)) {
      await audit(tx, { tenantId: ptx.tenantId, actor }, 'billing.amount_mismatch', { entityType: 'PaymentTransaction', entityId: ptx.id, detail: { expected: ptx.amountPaise, got: amountPaise, currency } });
      throw new AppError(422, 'PAYMENT_AMOUNT_MISMATCH', 'Payment amount does not match the order');
    }

    // Claim the application exactly once (verify-callback and webhook may race).
    const claim = await tx.paymentTransaction.updateMany({
      where: { id: ptx.id, appliedAt: null },
      data: { status: 'CAPTURED', providerPaymentId, appliedAt: new Date(), failureReason: null },
    });
    if (claim.count === 0) return { applied: false, alreadyApplied: true };

    const now = new Date();
    const current = await tx.subscription.findFirst({ where: { tenantId: ptx.tenantId }, orderBy: { currentPeriodEnd: 'desc' } });
    const samePlan = current?.planId === ptx.planId;
    // Same plan: stack onto remaining time. Plan change: new period starts now (no proration in v1).
    const { start, end } = nextPeriod({ subscription: samePlan ? current : null, plan: ptx.plan, now });

    let sub;
    if (current) {
      sub = await tx.subscription.update({
        where: { id: current.id },
        data: { planId: ptx.planId, status: 'ACTIVE', currentPeriodStart: samePlan && current.status !== 'TRIAL' ? current.currentPeriodStart : start, currentPeriodEnd: end, cancelAtPeriodEnd: false, cancelledAt: null },
      });
      await tx.subscriptionEvent.create({ data: { subscriptionId: sub.id, type: samePlan ? 'RENEWED' : 'PLAN_CHANGED', fromStatus: current.status, toStatus: 'ACTIVE', actor, detail: { paymentId: providerPaymentId, orderId: providerOrderId, periodEnd: end } } });
    } else {
      sub = await tx.subscription.create({ data: { tenantId: ptx.tenantId, planId: ptx.planId, status: 'ACTIVE', currentPeriodStart: start, currentPeriodEnd: end } });
      await tx.subscriptionEvent.create({ data: { subscriptionId: sub.id, type: 'ACTIVATED', toStatus: 'ACTIVE', actor, detail: { paymentId: providerPaymentId, orderId: providerOrderId } } });
    }
    // NOTE: a platform suspension is deliberately NOT lifted here.
    await audit(tx, { tenantId: ptx.tenantId, actor }, 'billing.payment_applied', { entityType: 'Subscription', entityId: sub.id, detail: { providerPaymentId, periodEnd: end } });
    return { applied: true, subscriptionId: sub.id };
  });
}

export async function markPaymentFailed({ providerOrderId, providerPaymentId, reason, actor }) {
  const ptx = await prisma.paymentTransaction.findUnique({ where: { providerOrderId } });
  if (!ptx) return { recorded: false };
  // Never downgrade a captured payment because of an out-of-order failure event.
  await prisma.paymentTransaction.updateMany({ where: { id: ptx.id, appliedAt: null }, data: { status: 'FAILED', failureReason: reason?.slice(0, 500) ?? 'Payment failed' } });
  await audit(prisma, { tenantId: ptx.tenantId, actor }, 'billing.payment_failed', { entityType: 'PaymentTransaction', entityId: ptx.id, detail: { providerPaymentId, reason } });
  return { recorded: true };
}

// ───────────── Status, history, cancellation ─────────────

export const listPayments = (ctx) => prisma.paymentTransaction.findMany({
  where: { tenantId: ctx.tenantId }, orderBy: { createdAt: 'desc' }, take: 100,
  include: { plan: { select: { name: true, interval: true } } },
}).then((rows) => rows.map(({ tenantId, ...r }) => r));

export const listEvents = (ctx) => prisma.subscriptionEvent.findMany({ where: { subscription: { tenantId: ctx.tenantId } }, orderBy: { createdAt: 'desc' }, take: 100 });

export async function cancelAtPeriodEnd(ctx) {
  const sub = ctx.subscription;
  if (!sub || !['ACTIVE', 'PAST_DUE'].includes(sub.status)) throw new AppError(409, 'NOTHING_TO_CANCEL', 'There is no active paid subscription to cancel');
  await prisma.$transaction([
    prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true, cancelledAt: new Date() } }),
    prisma.subscriptionEvent.create({ data: { subscriptionId: sub.id, type: 'CANCELLED', fromStatus: sub.status, toStatus: sub.status, actor: ctx.actor, detail: { effectiveAt: sub.currentPeriodEnd } } }),
  ]);
  return { cancelAtPeriodEnd: true, accessUntil: sub.currentPeriodEnd };
}

/** Checkout callback: valid HMAC proves Razorpay issued this payment for this order. */
export async function verifyCheckout(ctx, body) {
  const valid = verifyPaymentSignature({ orderId: body.razorpay_order_id, paymentId: body.razorpay_payment_id, signature: body.razorpay_signature, keySecret: env.RAZORPAY_KEY_SECRET });
  if (!valid) {
    await audit(prisma, ctx, 'billing.signature_invalid', { detail: { orderId: body.razorpay_order_id } });
    throw new AppError(400, 'PAYMENT_SIGNATURE_INVALID', 'Payment could not be verified');
  }
  return applyVerifiedPayment({ providerOrderId: body.razorpay_order_id, providerPaymentId: body.razorpay_payment_id, actor: ctx.actor, tenantIdHint: ctx.tenantId });
}
