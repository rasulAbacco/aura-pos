import { parse, ok, created, toJSONSafe } from '../../core/utils/http.js';
import * as staff from './staff.service.js';
import { staffSchema, staffUpdateSchema } from './staff.validation.js';

export async function list(req, res) { ok(res, toJSONSafe((await staff.listStaff(req.ctx, req.query.bookable === 'true')).map((s) => staff.present(req.ctx, s)))); }
export async function get(req, res) { ok(res, toJSONSafe(staff.present(req.ctx, await staff.getStaff(req.ctx, req.params.id)))); }
export async function create(req, res) { created(res, toJSONSafe(staff.present(req.ctx, await staff.createStaff(req.ctx, parse(staffSchema, req.body))))); }
export async function update(req, res) { ok(res, toJSONSafe(staff.present(req.ctx, await staff.updateStaff(req.ctx, req.params.id, parse(staffUpdateSchema, req.body))))); }
export async function archive(req, res) { await staff.archiveStaff(req.ctx, req.params.id); ok(res, { archived: true }); }
