import { LuArrowRight } from 'react-icons/lu';
import { RIBBON } from '../../utils/siteContent.js';
import { IMG } from '../../utils/siteImages.js';

/** Slowly scrolling strip of services (pauses on hover). */
export function ServiceRibbon() {
  const items = [...RIBBON, ...RIBBON];
  return (
    <section className="ribbon overflow-hidden border-y border-blush/70 bg-white/70 py-4" aria-label="Popular services">
      <ul className="ribbon-track flex w-max gap-12">
        {items.map(([name, img], i) => (
          <li key={i} aria-hidden={i >= RIBBON.length} className="flex items-center gap-3 whitespace-nowrap font-display text-[15px] text-ink">
            <img src={IMG[img]} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />{name}<LuArrowRight size={14} className="text-mauve" />
          </li>
        ))}
      </ul>
    </section>
  );
}
