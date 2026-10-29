import { parse, ok, toJSONSafe, pageArgs } from '../../core/utils/http.js';
import { badRequest } from '../../core/errors/errors.js';
import * as invoices from './invoices.service.js';
import { voidSchema, refundSchema } from './invoices.validation.js';

export async function list(req, res) {
  const { skip, take, page, pageSize } = pageArgs(req.query);
  const str = (k) => (typeof req.query[k] === 'string' ? req.query[k].trim() : undefined);
  const { rows, total } = await invoices.listInvoices(req.ctx, { skip, take, q: str('q'), status: str('status'), kind: str('kind'), from: str('from'), to: str('to') });
  ok(res, toJSONSafe(rows), { page, pageSize, total });
}

/** View / reprint. Reprinting never creates a new invoice. */
export async function get(req, res) {
  ok(res, toJSONSafe(await invoices.getInvoice(req.ctx, req.params.id)));
}

export async function voidOne(req, res) {
  const { reason } = parse(voidSchema, req.body);
  ok(res, await invoices.voidInvoice(req.ctx, req.params.id, reason));
}

export async function refund(req, res) {
  const body = parse(refundSchema, req.body);
  if (!body.preview && body.reason.length < 5) throw badRequest('Give a reason for the refund (at least 5 characters)');
  const result = await invoices.refundInvoice(req.ctx, req.params.id, body);
  res.status(body.preview ? 200 : 201).json({ data: result });
}
