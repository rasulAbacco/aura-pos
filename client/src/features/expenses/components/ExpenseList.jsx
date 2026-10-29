import { money, date } from '../../../utils/format.js';
import { Badge, Button, Skeleton } from '../../../components/ui';
import { CATEGORY_LABELS, PAYMENT_MODES } from '../utils/expenses.constants.js';

export function ExpenseList({ expenses, canManage, onVoid }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4" aria-label="Expenses">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Expenses for these dates</h2><span className="num text-sm text-stone-500">{money(expenses.meta?.sum)}</span></div>
      {expenses.loading ? <Skeleton rows={3} /> : !expenses.data?.length ? <p className="py-8 text-center text-sm text-stone-500">No expenses recorded for these dates.</p> : (
        <ul className="divide-y divide-stone-100">
          {expenses.data.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0"><p className="truncate font-medium">{e.title}</p><p className="text-xs text-stone-500">{date(e.spentOn)} · {PAYMENT_MODES[e.paymentMode]}{e.reference ? ` · ${e.reference}` : ''}</p></div>
              <Badge>{CATEGORY_LABELS[e.category]}</Badge>
              <span className="num shrink-0 font-semibold">{money(e.amount)}</span>
              {canManage && <Button size="sm" variant="ghost" onClick={() => onVoid(e)}>Void</Button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
