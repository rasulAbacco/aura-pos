import { useId, useState } from 'react';
import { LuMinus, LuPlus } from 'react-icons/lu';

/** Accessible accordion. `columns=2` lays the questions out in two columns (pricing page). */
export function FaqAccordion({ items, defaultOpen = 0, columns = 1, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  const base = useId();
  return (
    <div className={`grid gap-3 ${columns === 2 ? 'md:grid-cols-2 md:items-start' : ''} ${className}`}>
      {items.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className="rounded-xl border border-blush bg-white">
            <h3>
              <button type="button" aria-expanded={isOpen} aria-controls={`${base}-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink">
                {q}{isOpen ? <LuMinus className="shrink-0 text-mauve" /> : <LuPlus className="shrink-0 text-mauve" />}
              </button>
            </h3>
            <div id={`${base}-${i}`} className="faq-panel" data-open={isOpen}>
              <div><p className="px-5 pb-4 text-sm leading-relaxed text-stone-600">{a}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
