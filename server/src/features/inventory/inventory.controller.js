import { parse, ok, created, toJSONSafe, pageArgs } from '../../core/utils/http.js';
import { resolveBranch } from '../../core/utils/branch.js';
import * as inventory from './inventory.service.js';
import { receiptSchema, adjustmentSchema, transferSchema, supplierSchema } from './inventory.validation.js';

export async function receive(req, res) {
  const body = parse(receiptSchema, req.body);
  const branch = await resolveBranch(req, body.branchId);
  created(res, await inventory.receiveStock(req.ctx, branch.id, body));
}

export async function adjust(req, res) {
  const body = parse(adjustmentSchema, req.body);
  const branch = await resolveBranch(req, body.branchId);
  ok(res, await inventory.adjustStock(req.ctx, branch.id, body));
}

export async function transfer(req, res) {
  const body = parse(transferSchema, req.body);
  const from = await resolveBranch(req, body.fromBranchId);
  const to = await resolveBranch(req, body.toBranchId);
  ok(res, await inventory.transferStock(req.ctx, from.id, to.id, body));
}

export async function movements(req, res) {
  const { skip, take, page, pageSize } = pageArgs(req.query);
  const str = (k) => (typeof req.query[k] === 'string' ? req.query[k] : undefined);
  const { rows, total } = await inventory.listMovements(req.ctx, { skip, take, itemId: str('itemId'), branchId: str('branchId') });
  ok(res, toJSONSafe(rows), { page, pageSize, total });
}

export async function lowStock(req, res) { ok(res, await inventory.lowStock(req.ctx, (await resolveBranch(req)).id)); }
export async function valuation(req, res) { ok(res, await inventory.valuation(req.ctx, (await resolveBranch(req)).id)); }
export async function listSuppliers(req, res) { ok(res, await inventory.listSuppliers(req.ctx)); }
export async function createSupplier(req, res) { created(res, await inventory.createSupplier(req.ctx, parse(supplierSchema, req.body))); }
