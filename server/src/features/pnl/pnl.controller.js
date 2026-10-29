import { ok, toJSONSafe } from '../../core/utils/http.js';
import { assertBranchAccess } from '../../core/middleware/auth.middleware.js';
import { dateRange } from '../reports/reports.service.js';
import * as pnl from './pnl.service.js';

export async function report(req, res) {
  const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : null;
  if (branchId) assertBranchAccess(req.ctx, branchId);
  ok(res, toJSONSafe(await pnl.pnl(req.ctx, dateRange(req.query, req.ctx.tenant.timezone), branchId)));
}
