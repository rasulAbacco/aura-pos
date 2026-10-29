import { parse, ok, created, toJSONSafe, pageArgs } from '../../core/utils/http.js';
import * as expenses from './expenses.service.js';
import { expenseSchema, expenseUpdateSchema, voidSchema } from './expenses.validation.js';

export async function list(req, res) {
  const { skip, take, page, pageSize } = pageArgs(req.query);
  const str = (k) => (typeof req.query[k] === 'string' ? req.query[k] : undefined);
  const { rows, total, sum } = await expenses.listExpenses(req.ctx, { skip, take, includeVoided: req.query.includeVoided === 'true', category: str('category'), from: str('from'), to: str('to') });
  ok(res, toJSONSafe(rows), { page, pageSize, total, sum });
}
export async function create(req, res) { created(res, toJSONSafe(await expenses.createExpense(req.ctx, parse(expenseSchema, req.body)))); }
export async function update(req, res) { ok(res, toJSONSafe(await expenses.updateExpense(req.ctx, req.params.id, parse(expenseUpdateSchema, req.body)))); }
export async function voidOne(req, res) { await expenses.voidExpense(req.ctx, req.params.id, parse(voidSchema, req.body).reason); ok(res, { voided: true }); }
