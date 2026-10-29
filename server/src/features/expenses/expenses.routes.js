/** Expenses — /api/v1/expenses */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './expenses.controller.js';

export const router = Router();
const manage = [requirePermission('expenses.manage'), requireWritable()];

router.get('/', requirePermission('expenses.view'), c.list);
router.post('/', ...manage, c.create);
router.patch('/:id', ...manage, c.update);
router.post('/:id/void', ...manage, c.voidOne);
