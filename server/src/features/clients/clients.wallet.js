/**
 * Customer wallet: append-only ledger + cached balance updated in the SAME transaction
 * with a conditional UPDATE (and a CHECK constraint) so concurrent debits can't overspend.
 */
import { conflict } from '../../core/errors/errors.js';
import { r2 } from '../../core/money/money.js';

export async function walletChange(tx, { tenantId, customerId, amount, type, invoiceId, reason, actorUserId }) {
  const delta = r2(amount);
  if (delta.isZero()) return null;
  const rows = await tx.$queryRaw`
    UPDATE "Customer" SET "walletBalance" = "walletBalance" + ${delta.toFixed(2)}::numeric, "updatedAt" = now()
    WHERE "id" = ${customerId}::uuid AND "tenantId" = ${tenantId}::uuid AND "walletBalance" + ${delta.toFixed(2)}::numeric >= 0
    RETURNING "walletBalance"`;
  if (rows.length !== 1) throw conflict('INSUFFICIENT_WALLET', 'Wallet balance is not sufficient for this payment');
  return tx.walletEntry.create({
    data: { tenantId, customerId, type, amount: delta.toFixed(2), balanceAfter: rows[0].walletBalance, invoiceId, reason, actorUserId },
  });
}
