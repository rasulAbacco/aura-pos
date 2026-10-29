/** Small uppercase wine label with a trailing rule ("OUR PRODUCTS ——"). Pass center for a rule on both sides. */
export function Eyebrow({ children, center = false, className = '' }) {
  return (
    <p className={`flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-mauve ${center ? 'justify-center' : ''} ${className}`}>
      {center && <span className="h-px w-10 bg-mauve/40" />}
      {children}
      <span className="h-px w-10 bg-mauve/40" />
    </p>
  );
}

/** Centred section title + optional subtitle. */
export function SectionTitle({ title, subtitle, className = '' }) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="font-display text-3xl leading-tight text-ink md:text-[2.6rem]">{title}</h2>
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-sm text-stone-600 md:text-base">{subtitle}</p>}
    </div>
  );
}
