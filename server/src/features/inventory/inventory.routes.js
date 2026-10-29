/** Inventory — /api/v1/inventory */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './inventory.controller.js';

export const router = Router();
const view = requirePermission('inventory.view');
const manage = [requirePermission('inventory.manage'), requireWritable()];

router.post('/receipts', ...manage, c.receive);
router.post('/adjustments', ...manage, c.adjust);
router.post('/transfers', requirePermission('inventory.manage'), requireWritable('multibranch'), c.transfer);
router.get('/movements', view, c.movements);
router.get('/low-stock', view, c.lowStock);
router.get('/valuation', view, c.valuation);
router.get('/suppliers', view, c.listSuppliers);
router.post('/suppliers', ...manage, c.createSupplier);
