/**
 * The ONLY way stock changes. Atomic conditional update (never below zero) + ledger row,
 * executed inside the caller's transaction.
 */
import crypto from 'node:crypto';
import { conflict } from '../../core/errors/errors.js';

export async function changeStock(tx, { tenantId, branchId, itemId, delta, type, reference, invoiceId, unitCost, note, actorUserId, supplierId, batchNo, expiryDate, itemName }) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error('changeStock: delta must be a non-zero integer');
  // Ensure a row exists (first receipt at a new branch).
  await tx.$executeRaw`
    INSERT INTO "StockLevel" ("id", "tenantId", "branchId", "itemId", "quantity", "updatedAt")
    VALUES (${crypto.randomUUID()}::uuid, ${tenantId}::uuid, ${branchId}::uuid, ${itemId}::uuid, 0, now())
    ON CONFLICT ("branchId", "itemId") DO NOTHING`;
  const rows = await tx.$queryRaw`
    UPDATE "StockLevel" SET "quantity" = "quantity" + ${delta}, "updatedAt" = now()
    WHERE "branchId" = ${branchId}::uuid AND "itemId" = ${itemId}::uuid AND "tenantId" = ${tenantId}::uuid
      AND "quantity" + ${delta} >= 0
    RETURNING "quantity"`;
  if (rows.length !== 1) {
    const [cur] = await tx.$queryRaw`SELECT "quantity" FROM "StockLevel" WHERE "branchId" = ${branchId}::uuid AND "itemId" = ${itemId}::uuid`;
    throw conflict('INSUFFICIENT_STOCK', `Not enough stock${itemName ? ` for ${itemName}` : ''}: ${cur?.quantity ?? 0} available, ${-delta} requested`, { itemId, available: cur?.quantity ?? 0, requested: -delta });
  }
  const balanceAfter = rows[0].quantity;
  await tx.stockMovement.create({
    data: { tenantId, branchId, itemId, type, quantity: delta, balanceAfter, reference, invoiceId, unitCost, note, actorUserId, supplierId, batchNo, expiryDate },
  });
  return balanceAfter;
}
