/** Team members & permissions — /api/v1/users */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './users.controller.js';

export const router = Router();
const manage = requirePermission('users.manage');

router.get('/', manage, c.list);
router.get('/permissions', manage, c.permissions);
router.post('/invite', manage, requireWritable(), c.invite);
router.patch('/:id', manage, requireWritable(), c.updateAccess);
