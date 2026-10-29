/** Inventory: every stock change goes through changeStock() and leaves a movement row. */
import { prisma } from '../../core/database/prisma.js';
import { badRequest, notFound } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';
import { dec, r2, ZERO } from '../../core/money/money.js';
import { changeStock } from './inventory.stock.js';

async function productOrThrow(tenantId, itemId) {
  const item = await prisma.catalogItem.findFirst({ where: { id: itemId, tenantId, type: 'PRODUCT' } });
  if (!item) throw notFound('Product');
  return item;
}

/** Restock / goods received. */
export async function receiveStock(ctx, branchId, body) {
  const item = await productOrThrow(ctx.tenantId, body.itemId);
  if (body.supplierId && !(await prisma.supplier.findFirst({ where: { id: body.supplierId, tenantId: ctx.tenantId } }))) throw badRequest('Unknown supplier');
  return prisma.$transaction(async (tx) => {
    const balance = await changeStock(tx, { tenantId: ctx.tenantId, branchId, itemId: item.id, delta: body.quantity, type: 'RECEIPT', unitCost: body.unitCost?.toFixed(2), supplierId: body.supplierId, batchNo: body.batchNo, expiryDate: body.expiryDate, note: body.note, reference: body.batchNo, actorUserId: ctx.userId });
    await audit(tx, ctx, 'inventory.receipt', { entityType: 'CatalogItem', entityId: item.id, detail: { qty: body.quantity, branchId } });
    return { itemId: item.id, branchId, quantity: balance };
  });
}

/** Count corrections, damage, backbar consumption (reason mandatory). */
export async function adjustStock(ctx, branchId, body) {
  const item = await productOrThrow(ctx.tenantId, body.itemId);
  return prisma.$transaction(async (tx) => {
    const balance = await changeStock(tx, { tenantId: ctx.tenantId, branchId, itemId: item.id, delta: body.delta, type: body.type, note: body.note, actorUserId: ctx.userId, itemName: item.name });
    await audit(tx, ctx, 'inventory.adjust', { entityType: 'CatalogItem', entityId: item.id, detail: body });
    return { itemId: item.id, branchId, quantity: balance };
  });
}

export async function transferStock(ctx, fromBranchId, toBranchId, body) {
  const item = await productOrThrow(ctx.tenantId, body.itemId);
  await prisma.$transaction(async (tx) => {
    const ref = `TRF-${Date.now()}`;
    await changeStock(tx, { tenantId: ctx.tenantId, branchId: fromBranchId, itemId: item.id, delta: -body.quantity, type: 'TRANSFER_OUT', reference: ref, note: body.note, actorUserId: ctx.userId, itemName: item.name });
    await changeStock(tx, { tenantId: ctx.tenantId, branchId: toBranchId, itemId: item.id, delta: body.quantity, type: 'TRANSFER_IN', reference: ref, note: body.note, actorUserId: ctx.userId });
    await audit(tx, ctx, 'inventory.transfer', { entityType: 'CatalogItem', entityId: item.id, detail: body });
  });
  return { transferred: body.quantity };
}

export async function listMovements(ctx, { skip, take, itemId, branchId }) {
  const where = { tenantId: ctx.tenantId, ...(itemId ? { itemId } : {}), ...(branchId ? { branchId } : {}) };
  if (ctx.branchIds) where.branchId = where.branchId && ctx.branchIds.includes(where.branchId) ? where.branchId : { in: ctx.branchIds };
  const [rows, total] = await Promise.all([prisma.stockMovement.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }), prisma.stockMovement.count({ where })]);
  return { rows, total };
}

/** Low stock + reorder suggestion (bring back to 2× minimum). */
export async function lowStock(ctx, branchId) {
  const items = await prisma.catalogItem.findMany({ where: { tenantId: ctx.tenantId, type: 'PRODUCT', archivedAt: null }, include: { stockLevels: { where: { branchId } } } });
  return items
    .map((i) => ({ id: i.id, name: i.name, sku: i.sku, minStock: i.minStock, stock: i.stockLevels[0]?.quantity ?? 0 }))
    .filter((i) => i.stock <= i.minStock)
    .map((i) => ({ ...i, suggestedReorder: Math.max(i.minStock * 2 - i.stock, 1) }));
}

/** Valuation at cost (falls back to selling price when cost is unknown, flagged). */
export async function valuation(ctx, branchId) {
  const items = await prisma.catalogItem.findMany({ where: { tenantId: ctx.tenantId, type: 'PRODUCT' }, include: { stockLevels: { where: { branchId } } } });
  let total = ZERO;
  const rows = items.map((i) => {
    const qty = i.stockLevels[0]?.quantity ?? 0;
    const unit = i.cost ?? i.price;
    const value = r2(dec(unit).times(qty));
    total = total.plus(value);
    return { id: i.id, name: i.name, quantity: qty, unitValue: dec(unit).toFixed(2), value: value.toFixed(2), costKnown: i.cost !== null };
  });
  return { branchId, items: rows, total: total.toFixed(2) };
}

export const listSuppliers = (ctx) => prisma.supplier.findMany({ where: { tenantId: ctx.tenantId, isActive: true }, orderBy: { name: 'asc' } });
export const createSupplier = (ctx, data) => prisma.supplier.create({ data: { ...data, tenantId: ctx.tenantId } });
