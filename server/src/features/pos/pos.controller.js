/** POS controllers: parse the request, call the service, shape the response. No business rules here. */
import { parse, ok, created, toJSONSafe } from '../../core/utils/http.js';
import { badRequest, forbidden } from '../../core/errors/errors.js';
import { resolveBranch } from '../../core/utils/branch.js';
import { serialisePriced } from './pos.pricing.js';
import * as pos from './pos.service.js';
import { cartSchema, idempotencyKey, parkSchema, couponSchema } from './pos.validation.js';

/** Live totals for the cart UI. Same engine as checkout; no writes. */
export async function quote(req, res) {
  const body = parse(cartSchema, req.body);
  const branch = await resolveBranch(req, body.branchId);
  ok(res, serialisePriced(await pos.quote(req.ctx, { ...body, customerId: body.customerId ?? undefined }, branch)));
}

export async function checkout(req, res) {
  const key = parse(idempotencyKey, req.get('idempotency-key') ?? '');
  const body = parse(cartSchema, req.body);
  if (!body.payments?.length && !body.allowPartial) throw badRequest('Add at least one payment');
  if (body.allowPartial && !['OWNER', 'MANAGER'].includes(req.ctx.role)) throw forbidden('Only owners and managers can leave a balance due');
  const branch = await resolveBranch(req, body.branchId);
  const result = await pos.checkout(req.ctx, { ...body, customerId: body.customerId ?? undefined }, branch, key);
  const invoice = await pos.getInvoice(req.ctx, result.invoiceId);
  res.status(result.replayed ? 200 : 201).json({ data: toJSONSafe(invoice), meta: { replayed: result.replayed } });
}

export async function listParked(req, res) {
  const branch = await resolveBranch(req);
  ok(res, toJSONSafe(await pos.listParked(req.ctx, branch.id)));
}

export async function parkCart(req, res) {
  const body = parse(parkSchema, req.body);
  const branch = await resolveBranch(req);
  created(res, toJSONSafe(await pos.parkCart(req.ctx, branch.id, body)));
}

export async function deleteParked(req, res) {
  await pos.deleteParked(req.ctx, req.params.id);
  res.status(204).end();
}

export async function listCoupons(req, res) {
  ok(res, toJSONSafe(await pos.listCoupons(req.ctx, req.query.all === 'true')));
}

export async function createCoupon(req, res) {
  created(res, toJSONSafe(await pos.createCoupon(req.ctx, parse(couponSchema, req.body))));
}
