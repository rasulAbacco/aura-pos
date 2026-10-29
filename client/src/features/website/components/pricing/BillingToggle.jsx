import { cx } from '../../../../utils/cx.js';

/** Monthly / Yearly switch. Rendered only when the server offers annual plans. */
export function BillingToggle({ value, onChange, saving, className = '' }) {
  return (
    <div className={cx('inline-flex rounded-full bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-blush', className)} role="radiogroup" aria-label="Billing period">
      {[['MONTHLY', 'Monthly'], ['ANNUAL', 'Yearly']].map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cx('flex items-center gap-2 rounded-full px-6 py-2 transition', value === v ? 'bg-mauve text-white' : 'text-ink')}>
          {l}{v === 'ANNUAL' && saving && <span className={cx('rounded-full px-2 py-0.5 text-[10px]', value === v ? 'bg-white/20' : 'bg-rose-100 text-mauve')}>Save {saving}%</span>}
        </button>
      ))}
    </div>
  );
}
