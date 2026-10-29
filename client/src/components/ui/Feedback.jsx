/** Small presentational pieces used on every page: headers, empty/error/loading states, badges. */
import { Button } from './Button.jsx';
import { cx } from '../../utils/cx.js';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
      <p className="font-semibold text-stone-800">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
      <span>{children}</span>{onRetry && <Button size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Skeleton({ rows = 4 }) {
  return <div className="space-y-2" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-stone-200/70" />)}</div>;
}

const TONES = { stone: 'bg-stone-100 text-stone-700', green: 'bg-emerald-50 text-emerald-800', amber: 'bg-amber-50 text-amber-800', rose: 'bg-rose-50 text-rose-800', blue: 'bg-sky-50 text-sky-800' };
export function Badge({ tone = 'stone', children }) {
  return <span className={cx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', TONES[tone])}>{children}</span>;
}
