import { Eyebrow, LeafSprig, SiteIcon } from '../common';
import { MORE_TIME } from '../../utils/siteContent.js';
import { IMG } from '../../utils/siteImages.js';

export function MoreTime() {
  return (
    <section className="grid items-stretch lg:grid-cols-2">
      <div className="relative min-h-[22rem]">
        <img src={IMG.homeSalonLounge} alt="" className="absolute inset-0 h-full w-full object-cover lg:rounded-r-3xl" />
        <div data-reveal className="absolute bottom-10 left-6 flex items-center gap-4 rounded-2xl bg-white/95 p-5 shadow-xl md:left-10">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-petal text-mauve"><SiteIcon name="bill" /></span>
          <p className="font-semibold leading-snug text-ink">Save time.<br />Serve more clients.<br />Grow your business.</p>
        </div>
      </div>
      <div className="relative flex items-center px-5 py-14 md:px-14">
        <LeafSprig flip className="absolute right-2 top-2 h-44" />
        <div data-reveal className="max-w-lg">
          <Eyebrow>Built for modern salons</Eyebrow>
          <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">More time for what really matters.</h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">Automate routine tasks, keep your staff aligned and get clear insights into your business — so you can focus on your clients.</p>
          <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {MORE_TIME.map(([icon, label]) => <li key={label} className="text-center text-xs font-semibold text-ink"><SiteIcon name={icon} size={28} className="mx-auto mb-2 text-mauve" />{label}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
