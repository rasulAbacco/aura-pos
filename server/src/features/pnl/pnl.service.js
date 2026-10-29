/**
 * Operational profit & loss for a date range: revenue (net of discounts and credit notes, excluding
 * GST and tips) minus staff cost minus running expenses. The arithmetic is in pnl.calculations.js.
 */
import { prisma } from '../../core/database/prisma.js';
import { ZERO } from '../../core/money/money.js';
import { computePnL } from './pnl.calculations.js';
import { revenueByType, staffLedger } from '../reports/reports.service.js';

export async function pnl(ctx, range, branchId) {
  const [rev, ledger, expenses] = await Promise.all([
    revenueByType(ctx, range, branchId),
    staffLedger(ctx, range, branchId),
    prisma.expense.groupBy({
      by: ['category'], _sum: { amount: true },
      where: { tenantId: ctx.tenantId, voidedAt: null, spentOn: { gte: new Date(`${range.from}T00:00:00Z`), lte: new Date(`${range.to}T00:00:00Z`) }, ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}) },
    }),
  ]);
  const result = computePnL({
    revenueByType: rev.byType, discounts: rev.discounts, refunds: rev.refunds,
    baseSalaries: ledger.reduce((a, s) => a.plus(s.basePayForPeriod), ZERO),
    commissions: ledger.reduce((a, s) => a.plus(s.commission), ZERO),
    expensesByCategory: Object.fromEntries(expenses.map((e) => [e.category, e._sum.amount])),
    payrollIsEstimate: true,
  });
  return { range: { from: range.from, to: range.to }, ...result, gstCollected: rev.gst, notes: [
    'Revenue excludes GST, tips and wallet top-ups; membership sales are recognised when sold.',
    'Staff base pay is prorated from salary settings (estimate) until payroll runs are approved.',
    'Operational management report — not statutory financial statements.',
  ] };
}
