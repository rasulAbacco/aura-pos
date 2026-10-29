/** Payment-provider webhooks — /api/v1/webhooks (raw body, no login: verified by HMAC signature). */
import { Router } from 'express';
import { handleRazorpayWebhook } from './razorpay.webhook.js';

export const router = Router();

router.post('/razorpay', async (req, res) => {
  const { httpStatus, body } = await handleRazorpayWebhook({
    rawBody: req.body, signature: req.get('x-razorpay-signature'), eventIdHeader: req.get('x-razorpay-event-id'), requestId: req.id,
  });
  res.status(httpStatus).json(body);
});
