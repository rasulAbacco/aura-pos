import { cx } from '../../../utils/cx.js';

/** tone: 'profit' | 'loss' | undefined */
export function KpiCard({ label, value, note, tone }) {
  return (
    <div className={cx('rounded-xl border bg-white p-4', tone === 'profit' ? 'border-emerald-300' : tone === 'loss' ? 'border-rose-300' : 'border-stone-200')}>
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className={cx('num mt-1 text-2xl font-extrabold', tone === 'profit' && 'text-ledger', tone === 'loss' && 'text-rose-800')}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-stone-500">{note}</p>}
    </div>
  );
}
