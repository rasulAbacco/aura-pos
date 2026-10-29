/**
 * Operational Profit & Loss (management report, NOT statutory accounts).
 *
 *   A  Revenue        = Σ net line amounts (after discount, ex-GST) of issued invoices
 *                       − Σ net amounts of credit notes in the period, split by line type.
 *                       GST collected, tips and wallet top-ups are excluded (liabilities).
 *                       Wallet redemptions are a payment method, so revenue is recognised
 *                       once, at the sale — never again at redemption.
 *   B  Staff cost     = base pay for the period + commissions earned (net of reversals).
 *                       Base pay uses approved payroll when present, otherwise an
 *                       estimate prorated from each staff member's salary frequency.
 *   C  Opex           = Σ non-voided expenses dated in the period.
 *   Net = A − B − C;  margin = Net ÷ A.
 */
import { ZERO, dec, r2, sum } from '../../core/money/money.js';

export const EXPENSE_CATEGORIES = ['RENT', 'UTILITIES', 'SUPPLIES', 'HOUSEKEEPING', 'MARKETING', 'PANTRY', 'MAINTENANCE', 'MISCELLANEOUS'];

const DAY = 86400000;
const utcDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/**
 * Base salary attributable to [from, to] inclusive (UTC calendar days).
 * MONTHLY: salary × Σ (days covered in month ÷ days in month) — a full calendar month = exactly 1×.
 * WEEKLY : salary × days ÷ 7.   DAILY: salary × days (assumes paid every calendar day; documented estimate).
 */
export function proratedSalary(baseSalary, frequency, from, to) {
  const salary = dec(baseSalary);
  const start = utcDay(from), end = utcDay(to);
  if (end < start || salary.isZero()) return ZERO;
  const days = (end - start) / DAY + 1;
  if (frequency === 'WEEKLY') return r2(salary.times(days).dividedBy(7));
  if (frequency === 'DAILY') return r2(salary.times(days));
  let total = ZERO;
  let cursor = new Date(start);
  while (utcDay(cursor) <= end) {
    const y = cursor.getUTCFullYear(), m = cursor.getUTCMonth();
    const monthStart = Date.UTC(y, m, 1), monthEnd = Date.UTC(y, m + 1, 0);
    const dim = (monthEnd - monthStart) / DAY + 1;
    const covered = (Math.min(monthEnd, end) - Math.max(monthStart, start)) / DAY + 1;
    total = total.plus(salary.times(covered).dividedBy(dim));
    cursor = new Date(Date.UTC(y, m + 1, 1));
  }
  return r2(total);
}

/**
 * @param {object} p
 * @param {{SERVICE?, PRODUCT?, MEMBERSHIP?, CUSTOM?}} p.revenueByType  net of credit notes
 * @param {*} p.discounts  informational
 * @param {*} p.refunds    informational (already netted from revenue)
 * @param {*} p.baseSalaries
 * @param {*} p.commissions
 * @param {Record<string, *>} p.expensesByCategory
 */
export function computePnL({ revenueByType = {}, discounts = 0, refunds = 0, baseSalaries = 0, commissions = 0, expensesByCategory = {}, payrollIsEstimate = true }) {
  const services = r2(dec(revenueByType.SERVICE).plus(dec(revenueByType.CUSTOM)));
  const products = r2(revenueByType.PRODUCT);
  const memberships = r2(revenueByType.MEMBERSHIP);
  const revenue = services.plus(products).plus(memberships);

  const salaries = r2(baseSalaries);
  const comm = r2(commissions);
  const staffCost = salaries.plus(comm);

  const byCat = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, r2(expensesByCategory[c])]));
  const opex = sum(Object.values(byCat));

  const net = revenue.minus(staffCost).minus(opex);
  const margin = revenue.isZero() ? null : net.dividedBy(revenue).times(100).toDecimalPlaces(1);

  return {
    revenue: { services, products, memberships, total: revenue, discountsGiven: r2(discounts), refunds: r2(refunds) },
    staff: { baseSalaries: salaries, commissions: comm, total: staffCost, isEstimate: payrollIsEstimate },
    expenses: { byCategory: byCat, total: opex },
    netProfit: net,
    marginPercent: margin,
    productShare: revenue.isZero() ? null : products.dividedBy(revenue).times(100).toDecimalPlaces(1),
  };
}
