import { parse, ok, created, toJSONSafe } from '../../core/utils/http.js';
import { resolveBranch } from '../../core/utils/branch.js';
import * as catalog from './catalog.service.js';
import { categorySchema, itemSchema, itemUpdateSchema } from './catalog.validation.js';

export async function listCategories(req, res) { ok(res, await catalog.listCategories(req.ctx)); }
export async function createCategory(req, res) { created(res, await catalog.createCategory(req.ctx, parse(categorySchema, req.body))); }

export async function listItems(req, res) {
  const branch = await resolveBranch(req);
  const q = req.query;
  const items = await catalog.listItems(req.ctx, branch.id, {
    q: typeof q.q === 'string' ? q.q.trim() : '',
    includeArchived: q.includeArchived === 'true',
    activeOnly: q.activeOnly === 'true',
    type: ['SERVICE', 'PRODUCT'].includes(q.type) ? q.type : undefined,
    categoryId: typeof q.categoryId === 'string' ? q.categoryId : undefined,
  });
  ok(res, toJSONSafe(items), { branchId: branch.id });
}

export async function createItem(req, res) {
  const data = parse(itemSchema, req.body);
  const branch = await resolveBranch(req);
  created(res, toJSONSafe(await catalog.createItem(req.ctx, branch.id, data)));
}

export async function updateItem(req, res) { ok(res, toJSONSafe(await catalog.updateItem(req.ctx, req.params.id, parse(itemUpdateSchema, req.body)))); }
export async function archiveItem(req, res) { await catalog.setArchived(req.ctx, req.params.id, true); ok(res, { archived: true }); }
export async function restoreItem(req, res) { await catalog.setArchived(req.ctx, req.params.id, false); ok(res, { restored: true }); }
