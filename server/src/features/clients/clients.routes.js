/** Clients (CRM) — /api/v1/clients */
import { Router } from 'express';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import * as c from './clients.controller.js';

export const router = Router();
const view = requirePermission('customers.view');
const manage = [requirePermission('customers.manage'), requireWritable()];

router.get('/', view, c.list);
router.post('/', ...manage, c.create);
router.get('/:id', view, c.profile);
router.patch('/:id', ...manage, c.update);
router.post('/:id/anonymize', requirePermission('customers.manage', 'customers.sensitive'), c.anonymize);
router.get('/:id/wallet', view, c.wallet);
router.post('/:id/wallet/adjust', requirePermission('wallet.adjust'), requireWritable(), c.adjustWallet);
router.post('/:id/patch-tests', requirePermission('customers.sensitive'), requireWritable(), c.addPatchTest);
