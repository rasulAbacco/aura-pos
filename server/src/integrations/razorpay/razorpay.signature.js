/**
 * Razorpay signature verification (server-side only; secrets never leave the backend).
 *  - Checkout:  HMAC_SHA256(`${order_id}|${payment_id}`, key_secret) === razorpay_signature
 *  - Webhook :  HMAC_SHA256(raw request body, webhook_secret) === X-Razorpay-Signature
 * Comparison is constant-time. The webhook MUST be verified against the exact raw bytes
 * received — re-serialising parsed JSON changes the bytes and breaks verification.
 */
import crypto from 'node:crypto';

const hmacHex = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('hex');

function safeEqualHex(expectedHex, givenHex) {
  if (typeof givenHex !== 'string' || !/^[0-9a-f]+$/i.test(givenHex)) return false;
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(givenHex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyPaymentSignature({ orderId, paymentId, signature, keySecret }) {
  if (!orderId || !paymentId || !keySecret) return false;
  return safeEqualHex(hmacHex(`${orderId}|${paymentId}`, keySecret), signature);
}

export function verifyWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!Buffer.isBuffer(rawBody) || !webhookSecret) return false;
  return safeEqualHex(hmacHex(rawBody, webhookSecret), signature);
}

// Exported for tests that need to produce valid signatures.
export const signForTest = hmacHex;
