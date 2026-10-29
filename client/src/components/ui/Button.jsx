import { cx } from '../../utils/cx.js';

const VARIANTS = {
  primary: 'bg-rose-700 text-white hover:bg-rose-800 disabled:bg-rose-700/50',
  secondary: 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-50',
  dark: 'bg-stone-900 text-white hover:bg-stone-800',
  ghost: 'text-stone-700 hover:bg-stone-100',
  danger: 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50',
};
const SIZES = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-base' };

export function Button({ variant = 'secondary', size = 'md', className, loading, children, ...props }) {
  return (
    <button className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60', VARIANTS[variant], SIZES[size], className)} disabled={loading || props.disabled} {...props}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}
