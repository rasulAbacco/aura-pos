import { parse, ok, created, toJSONSafe, pageArgs } from '../../core/utils/http.js';
import * as clients from './clients.service.js';
import { clientSchema, clientUpdateSchema, walletAdjustSchema, patchTestSchema } from './clients.validation.js';

export async function list(req, res) {
  const { skip, take, page, pageSize } = pageArgs(req.query);
  const { rows, total } = await clients.listClients(req.ctx, { skip, take, q: typeof req.query.q === 'string' ? req.query.q.trim() : '' });
  ok(res, toJSONSafe(rows), { page, pageSize, total });
}
export async function create(req, res) { created(res, toJSONSafe(await clients.createClient(req.ctx, parse(clientSchema, req.body)))); }
export async function profile(req, res) { ok(res, toJSONSafe(await clients.clientProfile(req.ctx, req.params.id))); }
export async function update(req, res) { ok(res, toJSONSafe(await clients.updateClient(req.ctx, req.params.id, parse(clientUpdateSchema, req.body)))); }
export async function anonymize(req, res) { await clients.anonymize(req.ctx, req.params.id); ok(res, { anonymized: true }); }
export async function wallet(req, res) { ok(res, toJSONSafe(await clients.walletLedger(req.ctx, req.params.id))); }
export async function adjustWallet(req, res) { created(res, toJSONSafe(await clients.adjustWallet(req.ctx, req.params.id, parse(walletAdjustSchema, req.body)))); }
export async function addPatchTest(req, res) { created(res, toJSONSafe(await clients.addPatchTest(req.ctx, req.params.id, parse(patchTestSchema, req.body)))); }
