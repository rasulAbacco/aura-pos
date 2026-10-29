/** Catalogue: services and retail products. Items are archived, never deleted, so invoices keep their history. */
import { prisma, isUniqueViolation } from '../../core/database/prisma.js';
import { conflict, notFound, badRequest } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';

const duplicate = (e) => { if (isUniqueViolation(e)) throw conflict('DUPLICATE', 'SKU or barcode already in use'); throw e; };

export const listCategories = (ctx) =>
  prisma.category.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, sortOrder: true } });

export async function createCategory(ctx, { name }) {
  try { return await prisma.category.create({ data: { tenantId: ctx.tenantId, name }, select: { id: true, name: true } }); }
  catch (e) { if (isUniqueViolation(e)) throw conflict('DUPLICATE', 'Category already exists'); throw e; }
}

/** Catalogue with stock for one branch. */
export async function listItems(ctx, branchId, { q, includeArchived, activeOnly, type, categoryId }) {
  const where = {
    tenantId: ctx.tenantId,
    ...(includeArchived ? {} : { archivedAt: null }),
    ...(activeOnly ? { isActive: true } : {}),
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { equals: q } }, { barcode: { equals: q } }, { category: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
  };
  const items = await prisma.catalogItem.findMany({
    where, orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    include: { category: { select: { id: true, name: true } }, stockLevels: { where: { branchId }, select: { quantity: true } } },
  });
  return items.map(({ stockLevels, tenantId, ...i }) => {
    const stock = stockLevels[0]?.quantity ?? 0;
    return { ...i, stock: i.type === 'PRODUCT' ? stock : null, lowStock: i.type === 'PRODUCT' && stock <= i.minStock };
  });
}

async function assertCategory(tenantId, categoryId) {
  if (!(await prisma.category.findFirst({ where: { id: categoryId, tenantId } }))) throw badRequest('Unknown category');
}

export async function createItem(ctx, branchId, { openingStock, ...data }) {
  await assertCategory(ctx.tenantId, data.categoryId);
  if (data.type === 'SERVICE' && !data.durationMin) data.durationMin = 45;
  if (data.type === 'PRODUCT') data.durationMin = null;
  try {
    return await prisma.$transaction(async (tx) => {
      const it = await tx.catalogItem.create({ data: { ...data, tenantId: ctx.tenantId } });
      if (it.type === 'PRODUCT') {
        const qty = openingStock ?? 0;
        await tx.stockLevel.create({ data: { tenantId: ctx.tenantId, branchId, itemId: it.id, quantity: qty } });
        if (qty > 0) await tx.stockMovement.create({ data: { tenantId: ctx.tenantId, branchId, itemId: it.id, type: 'OPENING', quantity: qty, balanceAfter: qty, unitCost: data.cost ?? null, actorUserId: ctx.userId, note: 'Opening stock' } });
      }
      await audit(tx, ctx, 'catalog.create', { entityType: 'CatalogItem', entityId: it.id, detail: { name: it.name, price: it.price.toFixed(2) } });
      return it;
    });
  } catch (e) { return duplicate(e); }
}

/** Price/tax changes affect future invoices only — invoice lines are immutable snapshots. */
export async function updateItem(ctx, id, data) {
  const existing = await prisma.catalogItem.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) throw notFound('Item');
  if (data.categoryId) await assertCategory(ctx.tenantId, data.categoryId);
  try {
    const item = await prisma.catalogItem.update({ where: { id: existing.id }, data });
    await audit(prisma, ctx, 'catalog.update', { entityType: 'CatalogItem', entityId: item.id, detail: { before: { price: existing.price.toFixed(2), taxRate: existing.taxRate.toString() }, changes: data } });
    return item;
  } catch (e) { return duplicate(e); }
}

export async function setArchived(ctx, id, archived) {
  const { count } = await prisma.catalogItem.updateMany({
    where: { id, tenantId: ctx.tenantId, archivedAt: archived ? null : { not: null } },
    data: archived ? { archivedAt: new Date(), isActive: false } : { archivedAt: null, isActive: true },
  });
  if (!count) throw notFound('Item');
  await audit(prisma, ctx, archived ? 'catalog.archive' : 'catalog.restore', { entityType: 'CatalogItem', entityId: id });
}
