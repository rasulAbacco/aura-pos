import { cx } from '../../utils/cx.js';

/** Titled white card that frames a chart (consistent padding and height across pages). */
export function ChartCard({ title, children, className, height = 'h-64', empty }) {
  return (
    <section className={cx('rounded-xl border border-stone-200 bg-white p-4', className)} aria-label={title}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {empty ? <p className="py-20 text-center text-sm text-stone-500">{empty}</p> : <div className={cx('mt-3', height)}>{children}</div>}
    </section>
  );
}
