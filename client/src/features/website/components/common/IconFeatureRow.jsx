import { IconCircle } from './SiteIcon.jsx';

/** Row of small icon + label tiles under a hero (features / about pages). */
export function IconFeatureRow({ items }) {
  return (
    <section className="border-y border-blush/70 bg-white/40">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-10 gap-y-6 px-5 py-8 md:justify-between">
        {items.map(([icon, label]) => (
          <div key={label} className="flex w-20 flex-col items-center gap-2 text-center text-xs font-semibold text-ink">
            <IconCircle name={icon} size="sm" className="h-12 w-12" />{label}
          </div>
        ))}
      </div>
    </section>
  );
}
