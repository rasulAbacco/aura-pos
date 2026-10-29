/**
 * POS feature — /api/v1/pos
 * Read this file to see every endpoint, who may call it, and which controller handles it.
 */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './pos.controller.js';

export const router = Router();

router.post('/quote', requirePermission('pos.bill'), c.quote);
router.post('/checkout', requirePermission('pos.bill'), requireWritable(), c.checkout);


router.get('/parked', requirePermission('pos.bill'), c.listParked);
router.post('/parked', requirePermission('pos.bill'), requireWritable(), c.parkCart);
router.delete('/parked/:id', requirePermission('pos.bill'), c.deleteParked);

router.get('/coupons', requirePermission('pos.bill'), c.listCoupons);
router.post('/coupons', requirePermission('settings.manage'), requireWritable(), c.createCoupon);
