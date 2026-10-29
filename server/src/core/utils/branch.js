import { prisma } from '../database/prisma.js';
import { badRequest, notFound } from '../errors/errors.js';
import { assertBranchAccess } from '../middleware/auth.middleware.js';

/**
 * Resolve the working branch for a request: explicit id (header X-Branch-Id / body / query)
 * or the user's first accessible branch. Always tenant-scoped and access-checked.
 */
export async function resolveBranch(req, explicitId, db = prisma) {
  const id = explicitId ?? req.get('x-branch-id') ?? (typeof req.query.branchId === 'string' ? req.query.branchId : undefined);
  const { ctx } = req;
  if (id) {
    const branch = await db.branch.findFirst({ where: { id, tenantId: ctx.tenantId, isActive: true } });
    if (!branch) throw notFound('Branch');
    assertBranchAccess(ctx, branch.id);
    return branch;
  }
  const branch = await db.branch.findFirst({
    where: { tenantId: ctx.tenantId, isActive: true, ...(ctx.branchIds ? { id: { in: ctx.branchIds } } : {}) },
    orderBy: { createdAt: 'asc' },
  });
  if (!branch) throw badRequest('No accessible branch');
  return branch;
}
