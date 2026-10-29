import { money } from '../../../utils/format.js';

/** Headline figures for the period, straight from the P&L endpoint (same definitions as the P&L page). */
export function SummaryGrid({ pnl }) {
  const rows = [
    ['Service revenue', pnl.revenue.services],
    ['Retail revenue', pnl.revenue.products],
    ['Membership revenue', pnl.revenue.memberships],
    ['Discounts given', pnl.revenue.discountsGiven],
    ['Refunds (credit notes)', pnl.revenue.refunds],
    ['Commissions earned', pnl.staff.commissions],
    ['Running expenses', pnl.expenses.total],
    [Number(pnl.netProfit) < 0 ? 'Net loss' : 'Net profit', Math.abs(Number(pnl.netProfit))],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">{label}</p>
          <p className="num mt-1 text-xl font-extrabold">{money(value)}</p>
        </div>
      ))}
    </div>
  );
}
