/** Invoices & credit notes — /api/v1/invoices */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './invoices.controller.js';

export const router = Router();

router.get('/', requirePermission('invoices.view'), c.list);
router.get('/:id', requirePermission('invoices.view'), c.get);
router.post('/:id/void', requirePermission('pos.void'), requireWritable(), c.voidOne);
router.post('/:id/refund', requirePermission('pos.refund'), requireWritable(), c.refund);
