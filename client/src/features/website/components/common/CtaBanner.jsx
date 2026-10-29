import { PillLink } from './Buttons.jsx';
import { LeafSprig } from './LeafSprig.jsx';

/** Wine call-to-action band with a photo fading in from the right (every page ends with one). */
export function CtaBanner({ eyebrow, title, body, cta, to = '/register', image }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div data-reveal className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-mauve-deep via-mauve to-[#8d3651] text-white">
        <img src={image} alt="" className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-90 max-md:hidden" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-mauve to-transparent max-md:hidden" />
        <LeafSprig className="absolute -bottom-6 left-[42%] h-40 text-white/15" />
        <div className="relative max-w-xl px-8 py-10 md:px-12 md:py-12">
          {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">{eyebrow}</p>}
          <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
          {body && <p className="mt-3 text-sm text-white/80 md:text-base">{body}</p>}
          <PillLink to={to} variant="light" className="mt-6">{cta}</PillLink>
        </div>
      </div>
    </section>
  );
}
