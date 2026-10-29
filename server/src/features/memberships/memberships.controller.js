import { parse, ok, created, toJSONSafe } from '../../core/utils/http.js';
import * as memberships from './memberships.service.js';
import { planSchema, planUpdateSchema, cancelSchema } from './memberships.validation.js';

export async function listPlans(req, res) { ok(res, toJSONSafe(await memberships.listPlans(req.ctx, req.query.all === 'true'))); }
export async function createPlan(req, res) { created(res, toJSONSafe(await memberships.createPlan(req.ctx, parse(planSchema, req.body)))); }
export async function updatePlan(req, res) { ok(res, toJSONSafe(await memberships.updatePlan(req.ctx, req.params.id, parse(planUpdateSchema, req.body)))); }
export async function members(req, res) { ok(res, toJSONSafe(await memberships.activeMembers(req.ctx))); }
export async function cancel(req, res) { await memberships.cancelMembership(req.ctx, req.params.id, parse(cancelSchema, req.body).reason); ok(res, { cancelled: true }); }
