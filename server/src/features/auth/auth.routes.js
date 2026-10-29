/** Auth feature — /api/v1/auth */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { isTest } from '../../config/env.js';
import { AppError } from '../../core/errors/errors.js';
import { authenticate } from '../../core/middleware/auth.middleware.js';
import * as c from './auth.controller.js';

export const router = Router();

const limiter = (max, windowMin = 15, keyGenerator) => rateLimit({
  windowMs: windowMin * 60000, limit: isTest ? 1000 : max, standardHeaders: 'draft-7', legacyHeaders: false,
  ...(keyGenerator ? { keyGenerator } : {}),
  handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait and try again.')),
});
const perIp = limiter(30);
const perEmail = limiter(8, 15, (req) => `email:${String(req.body?.email ?? '').toLowerCase()}`);

router.post('/register', perIp, c.register);
router.post('/login', perIp, perEmail, c.login);
router.post('/refresh', perIp, c.refresh);
router.post('/logout', c.logout);
router.get('/me', authenticate, c.me);

router.post('/verify-email', perIp, c.verifyEmail);
router.post('/resend-verification', authenticate, limiter(5, 60), c.resendVerification);
router.post('/forgot-password', perIp, perEmail, c.forgotPassword);
router.post('/reset-password', perIp, c.resetPassword);
router.post('/change-password', authenticate, c.changePassword);
router.post('/accept-invite', perIp, c.acceptInvite);

router.get('/sessions', authenticate, c.listSessions);
router.delete('/sessions/:id', authenticate, c.revokeSession);
