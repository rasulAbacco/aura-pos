import { forwardRef, useId, useState } from "react";
import {
  LuEye,
  LuEyeOff,
  LuUser,
  LuStore,
  LuMail,
  LuPhone,
  LuLock,
} from "react-icons/lu";

const ICONS = {
  user: LuUser,
  store: LuStore,
  mail: LuMail,
  phone: LuPhone,
  lock: LuLock,
};

/**
 * Input with a leading icon, label, error and hint. type="password" adds a show/hide toggle.
 * Works with react-hook-form's register() (forwards ref and props).
 */
export const AuthInput = forwardRef(function AuthInput(
  { label, icon, error, hint, type = "text", ...props },
  ref,
) {
  const id = useId();
  const [show, setShow] = useState(false);
  const Icon = ICONS[icon];
  const isPw = type === "password";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500"
            aria-hidden
          />
        )}
        <input
          ref={ref}
          id={id}
          type={isPw && show ? "text" : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined}
          className={`w-full rounded-xl border bg-white py-3 text-[15px] text-ink placeholder:text-stone-400 focus:border-mauve/50 focus:outline-none focus:ring-2 focus:ring-mauve/20 ${Icon ? "pl-11" : "pl-4"} ${isPw ? "pr-11" : "pr-4"} ${error ? "border-rose-500" : "border-stone-200"}`}
          {...props}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-stone-500 hover:text-mauve"
          >
            {show ? <LuEyeOff size={18} /> : <LuEye size={18} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-e`} className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-h`} className="mt-1.5 text-xs text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

/** Full-width wine submit button with an optional trailing arrow. */
export function AuthSubmit({ busy, children, arrow = true, disabled }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-mauve py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_24px_-14px_rgb(123_40_67/.9)] transition hover:bg-mauve-deep disabled:opacity-60"
    >
      {busy ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
      {arrow && !busy && <span aria-hidden>→</span>}
    </button>
  );
}
