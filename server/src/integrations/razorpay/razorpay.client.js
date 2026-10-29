/**
 * Minimal server-side Razorpay REST client (Orders API).
 * Docs: https://razorpay.com/docs/api/orders/create/ — POST /v1/orders, HTTP basic auth
 * with key_id:key_secret, amount in the smallest currency unit (paise).
 * The key secret is used only here and never sent to the browser.
 */
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/errors.js';

function authHeader() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not configured on this server');
  }
  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
}

async function call(method, path, body) {
  let res;
  try {
    res = await fetch(`${env.RAZORPAY_API_BASE}${path}`, {
      method,
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(502, 'PAYMENT_PROVIDER_UNREACHABLE', 'Could not reach the payment provider. Please try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', json?.error?.description ?? `Payment provider error (${res.status})`);
  return json;
}

export const razorpay = {
  createOrder: ({ amountPaise, currency = 'INR', receipt, notes }) => call('POST', '/orders', { amount: amountPaise, currency, receipt, notes }),
  fetchOrderPayments: (orderId) => call('GET', `/orders/${encodeURIComponent(orderId)}/payments`),
};
