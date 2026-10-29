import { parse, ok, created } from '../../core/utils/http.js';
import { PERMISSIONS } from './users.permissions.js';
import * as users from './users.service.js';
import { inviteSchema, accessSchema } from './users.validation.js';

export async function list(req, res) { ok(res, await users.listUsers(req.ctx)); }
export function permissions(_req, res) { ok(res, PERMISSIONS); }
export async function invite(req, res) { created(res, await users.invite(req.ctx, parse(inviteSchema, req.body))); }
export async function updateAccess(req, res) { ok(res, await users.updateAccess(req.ctx, req.params.id, parse(accessSchema, req.body))); }
