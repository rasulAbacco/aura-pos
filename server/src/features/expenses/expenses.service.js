/** Running expenses. Records are voided with a reason, never deleted, so the audit trail stays whole. */
import { prisma } from '../../core/database/prisma.js';
import { notFound, badRequest } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';

export async function listExpenses(ctx, { skip, take, includeVoided, category, from, to }) {
  const where = {
    tenantId: ctx.tenantId,
    ...(includeVoided ? {} : { voidedAt: null }),
    ...(category ? { category } : {}),
    ...(from || to ? { spentOn: { ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00Z`) } : {}) } } : {}),
  };
  const [rows, total, agg] = await Promise.all([
    prisma.expense.findMany({ where, skip, take, orderBy: [{ spentOn: 'desc' }, { createdAt: 'desc' }] }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);
  return { rows, total, sum: agg._sum.amount?.toFixed(2) ?? '0.00' };
}

export async function createExpense(ctx, data) {
  if (data.branchId && !(await prisma.branch.findFirst({ where: { id: data.branchId, tenantId: ctx.tenantId } }))) throw badRequest('Unknown branch');
  const e = await prisma.expense.create({ data: { ...data, tenantId: ctx.tenantId, createdBy: ctx.userId } });
  await audit(prisma, ctx, 'expense.create', { entityType: 'Expense', entityId: e.id, detail: { amount: data.amount, category: data.category } });
  return e;
}

export async function updateExpense(ctx, id, data) {
  const e = await prisma.expense.findFirst({ where: { id, tenantId: ctx.tenantId, voidedAt: null } });
  if (!e) throw notFound('Expense');
  const u = await prisma.expense.update({ where: { id: e.id }, data });
  await audit(prisma, ctx, 'expense.update', { entityType: 'Expense', entityId: e.id, detail: { before: { amount: e.amount.toFixed(2), category: e.category }, changes: data } });
  return u;
}

export async function voidExpense(ctx, id, reason) {
  const { count } = await prisma.expense.updateMany({ where: { id, tenantId: ctx.tenantId, voidedAt: null }, data: { voidedAt: new Date(), voidReason: reason } });
  if (!count) throw notFound('Expense');
  await audit(prisma, ctx, 'expense.void', { entityType: 'Expense', entityId: id, detail: { reason } });
}
