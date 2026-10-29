/** Staff — /api/v1/staff */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './staff.controller.js';

export const router = Router();
const view = requirePermission('staff.view');
const manage = [requirePermission('staff.manage'), requireWritable()];

router.get('/', view, c.list);
router.get('/:id', view, c.get);
router.post('/', ...manage, c.create);
router.patch('/:id', ...manage, c.update);
router.post('/:id/archive', ...manage, c.archive);
