/**
 * Invoices after the sale: history, view/reprint, same-day void, and refunds as GST credit notes.
 * (Creating invoices is the POS checkout — see features/pos/pos.service.js.)
 */
import { prisma } from '../../core/database/prisma.js';
import { D, dec, r2, sum } from '../../core/money/money.js';
import { AppError, badRequest, conflict, notFound } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';
import { zonedDateString } from '../../core/utils/time.js';
import { reverseCommission } from '../staff/staff.commission.js';
import { changeStock } from '../inventory/inventory.stock.js';
import { walletChange } from '../clients/clients.wallet.js';
import { fyLabel, creditNoteNumber } from './invoices.numbering.js';

export async function listInvoices(ctx, { skip, take, q, status, kind, from, to }) {
  const where = {
    tenantId: ctx.tenantId,
    ...(ctx.branchIds ? { branchId: { in: ctx.branchIds } } : {}),
    ...(status ? { status } : {}),
    ...(kind ? { kind } : {}),
    ...(from || to ? { issuedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: 'insensitive' } }, { customer: { name: { contains: q, mode: 'insensitive' } } }, { customer: { phone: { contains: q } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({ where, skip, take, orderBy: { issuedAt: 'desc' }, select: { id: true, number: true, kind: true, status: true, issuedAt: true, grandTotal: true, amountDue: true, customerSnapshot: true, branchId: true } }),
    prisma.invoice.count({ where }),
  ]);
  return { rows, total };
}


export async function getInvoice(ctx, id, db = prisma) {
  const inv = await db.invoice.findFirst({
    where: { id, tenantId: ctx.tenantId, ...(ctx.branchIds ? { branchId: { in: ctx.branchIds } } : {}) },
    include: { lines: { orderBy: { lineNo: 'asc' } }, payments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!inv) throw notFound('Invoice');
  return inv;
}

/** Void: same business day, no refunds issued, reverses every side effect. */
export async function voidInvoice(ctx, id, reason) {
  return prisma.$transaction(async (tx) => {
    const inv = await getInvoice(ctx, id, tx);
    if (inv.kind !== 'INVOICE') throw conflict('NOT_VOIDABLE', 'Credit notes cannot be voided');
    if (inv.status === 'VOID') throw conflict('ALREADY_VOID', 'Invoice is already void');
    if (inv.lines.some((l) => l.refundedQuantity > 0)) throw conflict('NOT_VOIDABLE', 'Invoice has refunds; issue a refund instead');
    if (zonedDateString(inv.issuedAt, ctx.tenant.timezone) !== zonedDateString(new Date(), ctx.tenant.timezone)) throw conflict('NOT_VOIDABLE', 'Only same-day invoices can be voided; issue a refund (credit note) instead');

    const { count } = await tx.invoice.updateMany({ where: { id: inv.id, status: { not: 'VOID' } }, data: { status: 'VOID', voidReason: reason, voidedAt: new Date() } });
    if (!count) throw conflict('ALREADY_VOID', 'Invoice is already void');

    for (const l of inv.lines.filter((x) => x.type === 'PRODUCT')) {
      await changeStock(tx, { tenantId: ctx.tenantId, branchId: inv.branchId, itemId: l.itemId, delta: l.quantity, type: 'REFUND_RETURN', reference: `VOID ${inv.number}`, invoiceId: inv.id, actorUserId: ctx.userId });
    }
    // Reverse wallet movements made by this invoice (redemptions and membership bonuses).
    const walletRows = await tx.walletEntry.findMany({ where: { tenantId: ctx.tenantId, invoiceId: inv.id } });
    for (const w of walletRows) {
      await walletChange(tx, { tenantId: ctx.tenantId, customerId: w.customerId, amount: dec(w.amount).negated(), type: 'REVERSAL', invoiceId: inv.id, reason: `Void ${inv.number}`, actorUserId: ctx.userId });
    }
    await tx.customerMembership.updateMany({ where: { tenantId: ctx.tenantId, invoiceId: inv.id }, data: { status: 'CANCELLED' } });
    const comm = await tx.commissionEntry.findMany({ where: { tenantId: ctx.tenantId, invoiceId: inv.id, kind: { not: 'REVERSAL' } } });
    if (comm.length) await tx.commissionEntry.createMany({ data: comm.map((c) => ({ tenantId: ctx.tenantId, staffId: c.staffId, invoiceId: inv.id, invoiceLineId: c.invoiceLineId, kind: 'REVERSAL', baseAmount: dec(c.baseAmount).negated().toFixed(2), ratePercent: c.ratePercent.toString(), amount: dec(c.amount).negated().toFixed(2) })) });
    if (inv.customerId) await tx.customer.update({ where: { id: inv.customerId }, data: { visitCount: { decrement: 1 }, lifetimeSpend: { decrement: dec(inv.grandTotal).minus(inv.tip).toFixed(2) } } });
    if (inv.appointmentId) await tx.appointment.updateMany({ where: { id: inv.appointmentId, invoiceId: inv.id }, data: { status: 'IN_SERVICE', invoiceId: null } });
    await audit(tx, ctx, 'invoice.void', { entityType: 'Invoice', entityId: inv.id, detail: { number: inv.number, reason } });
    return { voided: true };
  });
}

/**
 * Refund selected quantities → CREDIT_NOTE with proportional amounts, optional restock,
 * proportional commission reversal, wallet credit for WALLET refunds.
 */
export async function refundInvoice(ctx, id, body) {
  return prisma.$transaction(async (tx) => {
    const inv = await getInvoice(ctx, id, tx);
    if (inv.kind !== 'INVOICE' || inv.status === 'VOID') throw conflict('NOT_REFUNDABLE', 'This invoice cannot be refunded');
    const byId = new Map(inv.lines.map((l) => [l.id, l]));
    const parts = body.lines.map((r) => {
      const line = byId.get(r.lineId);
      if (!line) throw badRequest('Unknown invoice line');
      if (line.type === 'MEMBERSHIP') throw conflict('NOT_REFUNDABLE', 'Membership sales are cancelled from the membership screen, not refunded per line');
      if (r.quantity > line.quantity - line.refundedQuantity) throw conflict('REFUND_EXCEEDS', `Only ${line.quantity - line.refundedQuantity} of "${line.description}" can be refunded`);
      const f = new D(r.quantity).dividedBy(line.quantity);
      const scale = (v) => r2(dec(v).times(f));
      const taxable = scale(line.taxableAmount), cgst = scale(line.cgstAmount), sgst = scale(line.sgstAmount), igst = scale(line.igstAmount);
      return { line, qty: r.quantity, gross: scale(line.grossAmount), discount: scale(line.discountAmount), taxable, cgst, sgst, igst, total: taxable.plus(cgst).plus(sgst).plus(igst) };
    });
    const refundTotal = sum(parts, (p) => p.total);
    if (body.preview) return { preview: true, amount: refundTotal.toFixed(2) }; // read-only; tx is rolled back by nothing being written
    if (!body.payments?.length) throw badRequest('Add how the refund is paid out');
    const methods = body.payments.map((p) => ({ ...p, amount: r2(p.amount) }));
    if (!sum(methods, (p) => p.amount).equals(refundTotal)) throw new AppError(422, 'REFUND_PAYMENT_MISMATCH', `Refund payments must total ₹${refundTotal.toFixed(2)}`);
    if (methods.some((p) => p.method === 'WALLET') && !inv.customerId) throw badRequest('Wallet refunds need a customer');

    for (const p of parts) {
      const { count } = await tx.invoiceLine.updateMany({ where: { id: p.line.id, refundedQuantity: { lte: p.line.quantity - p.qty } }, data: { refundedQuantity: { increment: p.qty } } });
      if (!count) throw conflict('REFUND_EXCEEDS', 'Line was refunded concurrently');
    }

    const [{ seq }] = await tx.$queryRaw`UPDATE "Branch" SET "nextCreditNumber" = "nextCreditNumber" + 1 WHERE "id" = ${inv.branchId}::uuid RETURNING "nextCreditNumber" - 1 AS seq`;
    const branch = await tx.branch.findUnique({ where: { id: inv.branchId } });
    const number = creditNoteNumber(branch.code, fyLabel(new Date(), ctx.tenant.timezone), seq);
    const T = (k) => sum(parts, (p) => p[k]).toFixed(2);
    const credit = await tx.invoice.create({ data: {
      tenantId: ctx.tenantId, branchId: inv.branchId, number, kind: 'CREDIT_NOTE', originalInvoiceId: inv.id, customerId: inv.customerId,
      cashierUserId: ctx.userId, status: 'PAID', customerSnapshot: inv.customerSnapshot ?? undefined, sellerSnapshot: inv.sellerSnapshot,
      placeOfSupply: inv.placeOfSupply, pricesIncludeTax: inv.pricesIncludeTax,
      subtotal: T('gross'), discountTotal: T('discount'), taxableTotal: T('taxable'), cgstTotal: T('cgst'), sgstTotal: T('sgst'), igstTotal: T('igst'),
      taxTotal: sum(parts, (p) => p.cgst.plus(p.sgst).plus(p.igst)).toFixed(2), tip: '0.00', roundOff: '0.00',
      grandTotal: refundTotal.toFixed(2), amountPaid: refundTotal.toFixed(2), amountDue: '0.00', voidReason: body.reason,
      lines: { create: parts.map((p, i) => ({
        lineNo: i + 1, type: p.line.type, itemId: p.line.itemId, description: p.line.description, sacHsn: p.line.sacHsn, staffId: p.line.staffId, staffName: p.line.staffName,
        quantity: p.qty, unitPrice: p.line.unitPrice, listPrice: p.line.listPrice, grossAmount: p.gross.toFixed(2), discountAmount: p.discount.toFixed(2), taxableAmount: p.taxable.toFixed(2),
        taxRate: p.line.taxRate, cgstAmount: p.cgst.toFixed(2), sgstAmount: p.sgst.toFixed(2), igstAmount: p.igst.toFixed(2), totalAmount: p.total.toFixed(2),
      })) },
      payments: { create: methods.map((m) => ({ tenantId: ctx.tenantId, method: m.method, amount: m.amount.negated().toFixed(2), reference: m.reference ?? null })) },
    } });

    for (const p of parts) {
      if (p.line.type === 'PRODUCT' && body.restock) {
        await changeStock(tx, { tenantId: ctx.tenantId, branchId: inv.branchId, itemId: p.line.itemId, delta: p.qty, type: 'REFUND_RETURN', reference: number, invoiceId: credit.id, actorUserId: ctx.userId });
      }
      const earned = await tx.commissionEntry.findFirst({ where: { tenantId: ctx.tenantId, invoiceLineId: p.line.id, kind: { in: ['SERVICE', 'PRODUCT'] } } });
      if (earned) {
        const rev = reverseCommission(earned, p.qty, p.line.quantity);
        await tx.commissionEntry.create({ data: { tenantId: ctx.tenantId, staffId: earned.staffId, invoiceId: credit.id, invoiceLineId: p.line.id, kind: 'REVERSAL', baseAmount: rev.baseAmount.toFixed(2), ratePercent: rev.ratePercent.toString(), amount: rev.amount.toFixed(2) } });
      }
    }
    const walletRefund = sum(methods.filter((m) => m.method === 'WALLET'), (m) => m.amount);
    if (walletRefund.greaterThan(0)) await walletChange(tx, { tenantId: ctx.tenantId, customerId: inv.customerId, amount: walletRefund, type: 'REFUND', invoiceId: credit.id, reason: `Refund ${number} for ${inv.number}`, actorUserId: ctx.userId });

    const fresh = await tx.invoiceLine.findMany({ where: { invoiceId: inv.id } });
    const fully = fresh.every((l) => l.refundedQuantity === l.quantity);
    await tx.invoice.update({ where: { id: inv.id }, data: { status: fully ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
    if (inv.customerId) await tx.customer.update({ where: { id: inv.customerId }, data: { lifetimeSpend: { decrement: refundTotal.toFixed(2) } } });
    await audit(tx, ctx, 'invoice.refund', { entityType: 'Invoice', entityId: inv.id, detail: { creditNote: number, amount: refundTotal.toFixed(2), reason: body.reason, restock: !!body.restock } });
    return { creditNoteId: credit.id, number, amount: refundTotal.toFixed(2) };
  });
}


