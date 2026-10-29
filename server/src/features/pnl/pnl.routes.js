/** Profit & loss — /api/v1/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD[&branchId=] */
import { Router } from 'express';
import { requirePermission } from '../../core/middleware/auth.middleware.js';
import * as c from './pnl.controller.js';

export const router = Router();

router.get('/', requirePermission('reports.view'), c.report);
