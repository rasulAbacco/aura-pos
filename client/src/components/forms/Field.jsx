import { forwardRef, useId } from 'react';
import { cx } from '../../utils/cx.js';

/** Labelled input/select/textarea with error + hint wiring for screen readers. Works with react-hook-form's register(). */
export const Field = forwardRef(function Field({ label, error, hint, as = 'input', className, children, ...props }, ref) {
  const id = useId();
  const Comp = as;
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1 block text-xs font-semibold text-stone-600">{label}</label>}
      <Comp ref={ref} id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
        className={cx('w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-600/40', error ? 'border-rose-500' : 'border-stone-300', as === 'textarea' && 'min-h-20')} {...props}>
        {children}
      </Comp>
      {error ? <p id={`${id}-e`} className="mt-1 text-xs text-rose-700">{error}</p> : hint ? <p id={`${id}-h`} className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
});
