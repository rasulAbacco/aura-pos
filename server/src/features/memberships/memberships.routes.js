/** Client memberships — /api/v1/memberships */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './memberships.controller.js';

export const router = Router();
const manage = [requirePermission('memberships.manage'), requireWritable()];

router.get('/plans', c.listPlans);
router.post('/plans', ...manage, c.createPlan);
router.patch('/plans/:id', ...manage, c.updatePlan);
router.get('/members', requirePermission('customers.view'), c.members);
router.post('/members/:id/cancel', ...manage, c.cancel);
