/** Reports & exports — /api/v1/reports (dashboard figures, staff ledger, CSV exports) */
import { Router } from 'express';
import { requirePermission } from '../../core/middleware/auth.middleware.js';
import * as c from './reports.controller.js';

export const router = Router();
const view = requirePermission('reports.view');
const exportCsv = requirePermission('reports.export');

router.get('/dashboard', c.dashboard);
router.get('/staff-ledger', view, c.staffLedger);
router.get('/export/invoices.csv', exportCsv, c.invoicesCsv);
router.get('/export/expenses.csv', exportCsv, c.expensesCsv);
router.get('/export/staff-ledger.csv', exportCsv, c.staffLedgerCsv);
