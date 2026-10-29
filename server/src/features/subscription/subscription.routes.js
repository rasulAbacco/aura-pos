/**
 * SaaS subscription — /api/v1/billing
 * Mounted after `authenticate` but NOT behind the read/write entitlement checks: expired and
 * suspended tenants must still see their status and renew. Suspension is lifted only by platform admins.
 */
import { Router } from 'express';
import { requirePermission } from '../../core/middleware/auth.middleware.js';
import * as c from './subscription.controller.js';

export const router = Router();

router.get('/status', c.status);
router.get('/payments', requirePermission('billing.manage'), c.payments);
router.get('/events', requirePermission('billing.manage'), c.events);
router.post('/orders', requirePermission('billing.manage'), c.createOrder);
router.post('/verify', requirePermission('billing.manage'), c.verify);
router.post('/cancel', requirePermission('billing.manage'), c.cancel);
