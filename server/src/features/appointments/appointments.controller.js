import { parse, ok, created, toJSONSafe } from '../../core/utils/http.js';
import { badRequest } from '../../core/errors/errors.js';
import { resolveBranch } from '../../core/utils/branch.js';
import * as appts from './appointments.service.js';
import { availabilitySchema, createSchema, statusSchema, rescheduleSchema } from './appointments.validation.js';

export async function list(req, res) {
  const branch = await resolveBranch(req);
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 12 * 3600000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(from.getTime() + 36 * 3600000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to - from > 62 * 86400000) throw badRequest('Invalid date range (max 62 days)');
  const rows = await appts.listAppointments(req.ctx, branch.id, { from, to, staffId: typeof req.query.staffId === 'string' ? req.query.staffId : undefined });
  ok(res, toJSONSafe(rows));
}

export async function availability(req, res) {
  const q = parse(availabilitySchema, req.query);
  ok(res, await appts.availability(req.ctx, await resolveBranch(req), q));
}

export async function create(req, res) {
  const body = parse(createSchema, req.body);
  const branch = await resolveBranch(req, body.branchId);
  created(res, toJSONSafe(await appts.createAppointment(req.ctx, branch.id, body)));
}

export async function changeStatus(req, res) { ok(res, toJSONSafe(await appts.changeStatus(req.ctx, req.params.id, parse(statusSchema, req.body)))); }
export async function reschedule(req, res) { ok(res, toJSONSafe(await appts.reschedule(req.ctx, req.params.id, parse(rescheduleSchema, req.body)))); }
export async function cart(req, res) { ok(res, toJSONSafe(await appts.cartForAppointment(req.ctx, req.params.id))); }
