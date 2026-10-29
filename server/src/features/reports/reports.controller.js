import { ok, toJSONSafe } from '../../core/utils/http.js';
import { assertBranchAccess } from '../../core/middleware/auth.middleware.js';
import { entitlementSummary } from '../subscription/subscription.summary.js';
import * as reports from './reports.service.js';
import { toCsv, sendCsv } from './reports.csv.js';

function branchParam(req) {
  const b = typeof req.query.branchId === 'string' ? req.query.branchId : null;
  if (b) assertBranchAccess(req.ctx, b);
  return b;
}
const range = (req) => reports.dateRange(req.query, req.ctx.tenant.timezone);

export async function staffLedger(req, res) {
  const r = range(req);
  ok(res, { range: { from: r.from, to: r.to }, staff: await reports.staffLedger(req.ctx, r, branchParam(req)) });
}

export async function dashboard(req, res) {
  const d = await reports.dashboard(req.ctx, branchParam(req));
  ok(res, toJSONSafe({ ...d, subscription: entitlementSummary(req.ctx.entitlement, req.ctx.subscription) }));
}

export async function invoicesCsv(req, res) {
  const r = range(req);
  const rows = await reports.invoicesForExport(req.ctx, r);
  sendCsv(res, `invoices_${r.from}_${r.to}.csv`, toCsv(
    ['Number', 'Kind', 'Status', 'Issued (UTC)', 'Customer', 'Subtotal', 'Discount', 'Taxable', 'CGST', 'SGST', 'IGST', 'Tip', 'Round-off', 'Grand total', 'Paid', 'Due', 'Payment methods'],
    rows.map((i) => [i.number, i.kind, i.status, i.issuedAt.toISOString(), i.customerSnapshot?.name ?? '', i.subtotal, i.discountTotal, i.taxableTotal, i.cgstTotal, i.sgstTotal, i.igstTotal, i.tip, i.roundOff, i.grandTotal, i.amountPaid, i.amountDue, i.payments.map((p) => `${p.method}:${p.amount}`).join(' ')]),
  ));
}

export async function expensesCsv(req, res) {
  const r = range(req);
  const rows = await reports.expensesForExport(req.ctx, r);
  sendCsv(res, `expenses_${r.from}_${r.to}.csv`, toCsv(['Date', 'Title', 'Category', 'Amount', 'Mode', 'Vendor', 'Reference', 'Notes', 'Voided'],
    rows.map((e) => [e.spentOn.toISOString().slice(0, 10), e.title, e.category, e.amount, e.paymentMode, e.vendor, e.reference, e.notes, e.voidedAt ? `yes: ${e.voidReason}` : ''])));
}

export async function staffLedgerCsv(req, res) {
  const r = range(req);
  const rows = await reports.staffLedger(req.ctx, r, null);
  sendCsv(res, `staff_ledger_${r.from}_${r.to}.csv`, toCsv(['Staff', 'Designation', 'Services', 'Sales (net)', 'Commission', 'Tips', 'Base pay (period)', 'Estimated payout'],
    rows.map((s) => [s.name, s.designation, s.servicesDone, s.sales, s.commission, s.tips, s.basePayForPeriod, s.estimatedPayout])));
}
