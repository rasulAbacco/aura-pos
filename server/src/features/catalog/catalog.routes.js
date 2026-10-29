/** Catalogue (services & products) — /api/v1/catalog */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './catalog.controller.js';

export const router = Router();
const manage = [requirePermission('catalog.manage'), requireWritable()];

router.get('/categories', c.listCategories);
router.post('/categories', ...manage, c.createCategory);
router.get('/items', c.listItems);
router.post('/items', ...manage, c.createItem);
router.patch('/items/:id', ...manage, c.updateItem);
router.post('/items/:id/archive', ...manage, c.archiveItem);
router.post('/items/:id/restore', ...manage, c.restoreItem);
