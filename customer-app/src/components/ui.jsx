/** Small building blocks used on every screen. */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuX, LuRefreshCw } from 'react-icons/lu';

const cx = (...c) => c.filter(Boolean).join(' ');
export { cx };

export function Button({ variant = 'primary', size = 'md', className, children, ...p }) {
  const v = {
    primary: 'bg-mauve text-white hover:bg-mauve-deep disabled:bg-mauve/40',
    secondary: 'bg-white text-ink ring-1 ring-blush hover:bg-petal disabled:opacity-50',
    ghost: 'text-mauve hover:bg-petal disabled:opacity-50',
    danger: 'bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3.5 text-base' }[size];
  return <button type="button" className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed', v, s, className)} {...p}>{children}</button>;
}

const TONES = { amber: 'bg-amber-50 text-amber-800 ring-amber-200', green: 'bg-emerald-50 text-emerald-800 ring-emerald-200', blue: 'bg-sky-50 text-sky-800 ring-sky-200', rose: 'bg-rose-50 text-rose-700 ring-rose-200', stone: 'bg-stone-100 text-stone-600 ring-stone-200', mauve: 'bg-petal text-mauve ring-blush' };
export const Badge = ({ tone = 'stone', children }) => <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', TONES[tone])}>{children}</span>;

/**
 * Page title row. Phones: sticky bar with a back button. Wide screens: a plain title row under the
 * top navigation (which is the sticky part there).
 */
export function Header({ title, back = true, right, sub, wide }) {
  const nav = useNavigate();
  return (
    <header className="safe-top sticky top-0 z-30 bg-cream/95 backdrop-blur md:static md:bg-transparent md:pt-6 md:backdrop-blur-none">
      <div className={cx('mx-auto flex h-14 items-center gap-2 px-3 md:h-auto md:px-6', wide === false ? 'max-w-3xl' : 'max-w-6xl')}>
        {back && <button aria-label="Back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} className="rounded-full p-2 text-ink hover:bg-petal md:-ml-2"><LuArrowLeft size={20} /></button>}
        <div className={cx('min-w-0 flex-1', !back && 'pl-2 md:pl-0')}>
          <h1 className="truncate font-display text-lg font-semibold leading-tight md:text-3xl">{title}</h1>
          {sub && <p className="truncate text-xs text-stone-500 md:text-sm">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

/** Page width: `narrow` for lists and forms, wide (default) for grids. */
export const Page = ({ children, className, narrow }) => <main className={cx('mx-auto w-full px-4 md:px-6', narrow ? 'max-w-3xl' : 'max-w-6xl', className)}>{children}</main>;

export function Spinner({ label = 'Loading…' }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500" role="status"><span className="h-5 w-5 animate-spin rounded-full border-2 border-blush border-t-mauve" />{label}</div>;
}

export function ErrorBox({ children, onRetry }) {
  return (
    <div role="alert" className="my-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800">
      <p>{children}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}><LuRefreshCw aria-hidden /> Try again</Button>}
    </div>
  );
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-petal text-mauve"><Icon size={26} aria-hidden /></span>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-xs text-sm text-stone-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Bottom sheet dialog. Escape / Android back closes it; focus moves in once when it opens. */
export function Sheet({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    ref.current?.querySelector('input,textarea,select,button')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close.current?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="animate-rise pb-safe max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-stone-500 hover:bg-petal"><LuX size={20} /></button>
        </div>
        {children}
        {footer && <div className="mt-5 flex gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, className, as = 'input', children, ...p }) {
  const C = as;
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-stone-700">{label}</span>
      <C className="w-full rounded-xl border border-blush bg-white px-3.5 py-3 text-ink outline-none focus:border-mauve focus:ring-2 focus:ring-mauve/20" {...p}>{children}</C>
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

/** − 2 + quantity control. */
export function Stepper({ value, onChange, max = 20, label }) {
  return (
    <div className="inline-flex items-center rounded-xl ring-1 ring-blush" role="group" aria-label={label}>
      <button aria-label="Remove one" className="h-9 w-9 rounded-l-xl text-lg font-bold text-mauve hover:bg-petal" onClick={() => onChange(value - 1)}>−</button>
      <span className="num w-7 text-center text-sm font-semibold" aria-live="polite">{value}</span>
      <button aria-label="Add one" disabled={value >= max} className="h-9 w-9 rounded-r-xl text-lg font-bold text-mauve hover:bg-petal disabled:opacity-30" onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
