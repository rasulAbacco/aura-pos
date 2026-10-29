import { Link } from 'react-router-dom';
import { LuArrowRight } from 'react-icons/lu';

const base = 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-offset-4';
const styles = {
  primary: 'bg-mauve text-white shadow-[0_10px_24px_-12px_rgb(123_40_67/.7)] hover:bg-mauve-deep',
  outline: 'border border-mauve/70 bg-white/60 text-mauve hover:bg-white',
  light: 'bg-white text-mauve hover:bg-cream',
};

/** Pill button that is a link. `to` for pages in the app, `href` for external sites. */
export function PillLink({ to, href, variant = 'primary', arrow = true, children, className = '', ...rest }) {
  const cls = `${base} ${styles[variant]} ${className}`;
  const inner = <>{children}{arrow && <LuArrowRight size={16} aria-hidden />}</>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls} {...rest}>{inner}</a>;
  return <Link to={to} className={cls} {...rest}>{inner}</Link>;
}
