import { money, date } from '../../../utils/format.js';
import { cx } from '../../../utils/cx.js';
import { CATEGORY_LABELS } from '../../expenses';

const Row = ({ label, value, strong, indent }) => (
  <tr className={cx(strong && 'font-semibold', 'border-b border-stone-100')}>
    <td className={cx('py-2', indent && 'pl-4 text-stone-600')}>{label}</td><td className="num py-2 text-right">{value}</td>
  </tr>
);

/** The income statement from the prototype: Revenue (A) − Staff cost (B) − Expenses (C). */
export function PnlStatement({ pnl: d, range }) {
  const loss = Number(d.netProfit) < 0;
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4" aria-label="Statement">
      <h2 className="mb-2 text-sm font-semibold">Statement for {date(range.from)} – {date(range.to)}</h2>
      <table className="w-full text-sm"><tbody>
        <Row label="Services" value={money(d.revenue.services)} indent />
        <Row label="Retail products" value={money(d.revenue.products)} indent />
        <Row label="Memberships" value={money(d.revenue.memberships)} indent />
        <Row label="Revenue (A)" value={money(d.revenue.total)} strong />
        <Row label="Base pay" value={money(d.staff.baseSalaries)} indent />
        <Row label="Commissions" value={money(d.staff.commissions)} indent />
        <Row label="Staff cost (B)" value={money(d.staff.total)} strong />
        {Object.entries(d.expenses.byCategory).map(([k, v]) => <Row key={k} label={CATEGORY_LABELS[k]} value={money(v)} indent />)}
        <Row label="Running expenses (C)" value={money(d.expenses.total)} strong />
        <tr className="bg-stone-900 text-white"><td className="px-2 py-3 font-bold">{loss ? 'Net loss' : 'Net profit'} (A − B − C)</td><td className="num px-2 py-3 text-right font-bold">{money(d.netProfit)}</td></tr>
      </tbody></table>
      <p className="mt-3 text-xs text-stone-500">GST collected in period: {money(d.gstCollected)} (owed to government, not revenue). {d.notes.at(-1)}</p>
    </section>
  );
}
