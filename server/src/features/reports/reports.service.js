import { prisma, Prisma } from '../../core/database/prisma.js';
import { dec, ZERO, r2 } from '../../core/money/money.js';
import { proratedSalary } from '../pnl/pnl.calculations.js';
import { zonedToUtc, zonedDateString } from '../../core/utils/time.js';
import { badRequest } from '../../core/errors/errors.js';

/** Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, tenant timezone). Default: current month. */
export function dateRange(query, tz) {
  const today = zonedDateString(new Date(), tz);
  const from = typeof query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : `${today.slice(0, 7)}-01`;
  const to = typeof query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : today;
  if (to < from) throw badRequest('"to" must be on or after "from"');
  const start = zonedToUtc(from, '00:00', tz);
  const [y, m, d] = to.split('-').map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  const end = zonedToUtc(nextDay, '00:00', tz);
  if (end - start > 400 * 86400000) throw badRequest('Range too long (max ~13 months)');
  return { from, to, start, end };
}

function branchFilter(ctx, branchId) {
  if (branchId) return Prisma.sql`AND i."branchId" = ${branchId}::uuid`;
  if (ctx.branchIds) return Prisma.sql`AND i."branchId" = ANY(${ctx.branchIds}::uuid[])`;
  return Prisma.empty;
}

export async function revenueByType(ctx, { start, end }, branchId) {
  const rows = await prisma.$queryRaw`
    SELECT l."type"::text AS type,
           SUM(CASE WHEN i."kind" = 'INVOICE' THEN l."taxableAmount" ELSE -l."taxableAmount" END) AS net,
           SUM(CASE WHEN i."kind" = 'INVOICE' THEN l."discountAmount" ELSE 0 END) AS discounts,
           SUM(CASE WHEN i."kind" = 'CREDIT_NOTE' THEN l."taxableAmount" ELSE 0 END) AS refunds,
           SUM(CASE WHEN i."kind" = 'INVOICE' THEN l."cgstAmount" + l."sgstAmount" + l."igstAmount" ELSE -(l."cgstAmount" + l."sgstAmount" + l."igstAmount") END) AS gst
    FROM "InvoiceLine" l JOIN "Invoice" i ON i."id" = l."invoiceId"
    WHERE i."tenantId" = ${ctx.tenantId}::uuid AND i."status" <> 'VOID'
      AND i."issuedAt" >= ${start} AND i."issuedAt" < ${end} ${branchFilter(ctx, branchId)}
    GROUP BY l."type"`;
  const out = { byType: {}, discounts: ZERO, refunds: ZERO, gst: ZERO };
  for (const r of rows) {
    out.byType[r.type] = dec(r.net);
    out.discounts = out.discounts.plus(dec(r.discounts));
    out.refunds = out.refunds.plus(dec(r.refunds));
    out.gst = out.gst.plus(dec(r.gst));
  }
  return out;
}

export async function staffLedger(ctx, range, branchId) {
  const staff = await prisma.staffProfile.findMany({ where: { tenantId: ctx.tenantId, OR: [{ archivedAt: null }, { archivedAt: { gte: range.start } }] }, orderBy: { name: 'asc' } });
  const comm = await prisma.$queryRaw`
    SELECT c."staffId", 
           SUM(CASE WHEN c."kind" IN ('SERVICE','PRODUCT','REVERSAL') THEN c."amount" ELSE 0 END) AS commission,
           SUM(CASE WHEN c."kind" = 'TIP' THEN c."amount" ELSE 0 END) AS tips,
           SUM(CASE WHEN c."kind" IN ('SERVICE','PRODUCT','REVERSAL') THEN c."baseAmount" ELSE 0 END) AS sales,
           COUNT(*) FILTER (WHERE c."kind" = 'SERVICE') AS services
    FROM "CommissionEntry" c JOIN "Invoice" i ON i."id" = c."invoiceId"
    WHERE c."tenantId" = ${ctx.tenantId}::uuid AND c."createdAt" >= ${range.start} AND c."createdAt" < ${range.end} ${branchFilter(ctx, branchId)}
    GROUP BY c."staffId"`;
  const byStaff = new Map(comm.map((r) => [r.staffId, r]));
  // Salary is attributed per *local* calendar day of the salon (not UTC days).
  const tz = ctx.tenant.timezone;
  const localDay = (d) => new Date(`${zonedDateString(d, tz)}T00:00:00Z`);
  const rangeFrom = new Date(`${range.from}T00:00:00Z`);
  const rangeTo = new Date(`${range.to}T00:00:00Z`);
  return staff.map((s) => {
    const r = byStaff.get(s.id);
    // Only days employed within the range count.
    const joined = s.joinedOn ? new Date(`${s.joinedOn.toISOString().slice(0, 10)}T00:00:00Z`) : localDay(s.createdAt);
    const from = joined > rangeFrom ? joined : rangeFrom;
    const left = s.archivedAt ? localDay(s.archivedAt) : null;
    const to = left && left < rangeTo ? left : rangeTo;
    const base = s.status === 'ACTIVE' || s.archivedAt ? proratedSalary(s.baseSalary, s.salaryFrequency, from, to) : ZERO;
    const commission = r2(r?.commission ?? 0);
    const tips = r2(r?.tips ?? 0);
    return {
      staffId: s.id, name: s.name, designation: s.designation, salaryFrequency: s.salaryFrequency, baseSalaryRate: s.baseSalary.toFixed(2),
      servicesDone: Number(r?.services ?? 0), sales: r2(r?.sales ?? 0).toFixed(2), commission: commission.toFixed(2), tips: tips.toFixed(2),
      basePayForPeriod: base.toFixed(2), estimatedPayout: base.plus(commission).plus(tips).toFixed(2),
      rates: { service: s.serviceCommission.toString(), product: s.productCommission.toString() },
    };
  });
}


// ───────────── Dashboard ─────────────

/** Dashboard: every number comes from the database for "today" in the tenant's timezone. */
export async function dashboard(ctx, branchId) {
  const tz = ctx.tenant.timezone;
  const today = zonedDateString(new Date(), tz);
  const range = dateRange({ from: today, to: today }, tz);
  const inv = { tenantId: ctx.tenantId, issuedAt: { gte: range.start, lt: range.end }, kind: 'INVOICE', ...(branchId ? { branchId } : ctx.branchIds ? { branchId: { in: ctx.branchIds } } : {}) };
  const canMoney = ctx.permissions.has('reports.view') || ctx.permissions.has('invoices.view');
  const trendStart = zonedToUtc(new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10), '00:00', tz);

  const [byStatus, totals, appts, rev, lowStock, newCustomers, trendRows, upcoming] = await Promise.all([
    prisma.invoice.groupBy({ by: ['status'], where: inv, _count: true }),
    prisma.invoice.aggregate({ where: { ...inv, status: { not: 'VOID' } }, _sum: { grandTotal: true, amountDue: true, tip: true }, _count: true }),
    prisma.appointment.groupBy({ by: ['status'], where: { tenantId: ctx.tenantId, startsAt: { gte: range.start, lt: range.end }, ...(branchId ? { branchId } : {}) }, _count: true }),
    revenueByType(ctx, range, branchId),
    prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "CatalogItem" c LEFT JOIN "StockLevel" s ON s."itemId" = c."id"
      WHERE c."tenantId" = ${ctx.tenantId}::uuid AND c."type" = 'PRODUCT' AND c."archivedAt" IS NULL AND COALESCE(s."quantity", 0) <= c."minStock"`,
    prisma.customer.count({ where: { tenantId: ctx.tenantId, createdAt: { gte: range.start, lt: range.end } } }),
    prisma.$queryRaw`SELECT to_char(("issuedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day,
        SUM(CASE WHEN "kind" = 'INVOICE' THEN "taxableTotal" ELSE -"taxableTotal" END) AS revenue
      FROM "Invoice" WHERE "tenantId" = ${ctx.tenantId}::uuid AND "status" <> 'VOID' AND "issuedAt" >= ${trendStart}
      GROUP BY 1 ORDER BY 1`,
    prisma.appointment.findMany({ where: { tenantId: ctx.tenantId, startsAt: { gte: new Date() }, status: { in: ['BOOKED', 'CONFIRMED', 'WAITING'] }, ...(branchId ? { branchId } : {}) }, orderBy: { startsAt: 'asc' }, take: 8, select: { id: true, startsAt: true, serviceName: true, status: true, customer: { select: { name: true } }, staff: { select: { name: true } } } }),
  ]);
  const sumType = (t) => rev.byType[t] ?? ZERO;
  return {
    date: today,
    sales: canMoney ? {
      collectedToday: totals._sum.grandTotal ?? '0', billsSettled: totals._count, outstanding: totals._sum.amountDue ?? '0', tips: totals._sum.tip ?? '0',
      serviceRevenue: sumType('SERVICE').plus(sumType('CUSTOM')), productRevenue: sumType('PRODUCT'), membershipRevenue: sumType('MEMBERSHIP'),
      invoicesByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      trend: trendRows.map((r) => ({ day: r.day, revenue: dec(r.revenue) })),
    } : null,
    appointmentsByStatus: Object.fromEntries(appts.map((a) => [a.status, a._count])),
    upcoming,
    lowStockCount: lowStock[0]?.n ?? 0,
    newCustomersToday: newCustomers,
  };
}

// ───────────── Export rows ─────────────
export const invoicesForExport = (ctx, range) => prisma.invoice.findMany({ where: { tenantId: ctx.tenantId, issuedAt: { gte: range.start, lt: range.end }, ...(ctx.branchIds ? { branchId: { in: ctx.branchIds } } : {}) }, orderBy: { issuedAt: 'asc' }, include: { payments: true } });
export const expensesForExport = (ctx, range) => prisma.expense.findMany({ where: { tenantId: ctx.tenantId, spentOn: { gte: new Date(`${range.from}T00:00:00Z`), lte: new Date(`${range.to}T00:00:00Z`) } }, orderBy: { spentOn: 'asc' } });
