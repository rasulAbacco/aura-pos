/** Appointments & queue — /api/v1/appointments */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './appointments.controller.js';

export const router = Router();
const view = requirePermission('appointments.view');
const manage = [requirePermission('appointments.manage'), requireWritable()];

router.get('/', view, c.list);
router.get('/availability', view, c.availability);
router.post('/', ...manage, c.create);
router.post('/:id/status', ...manage, c.changeStatus);
router.post('/:id/reschedule', ...manage, c.reschedule);
router.get('/:id/cart', requirePermission('pos.bill'), c.cart);
