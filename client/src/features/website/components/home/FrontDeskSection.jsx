import { LuHeart } from 'react-icons/lu';
import { Eyebrow, PillLink, IconCircle } from '../common';
import { NewBillMock } from '../mockups';
import { HOME_MODULES } from '../../utils/siteContent.js';
import { IMG } from '../../utils/siteImages.js';

/** "Everything your front desk and back office need" + billing screen + six modules. */
export function FrontDeskSection() {
  return (
    <section className="bg-gradient-to-b from-petal/70 to-cream">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.25fr_0.6fr]">
          <div data-reveal>
            <Eyebrow>All-in-one salon management</Eyebrow>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-[2.7rem]">Everything your front desk and back office need.</h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-600">A billing counter that does the GST for you. Add services, products, apply discounts, and generate professional bills in seconds. Keep your accounts GST-ready, with clear reports at your fingertips.</p>
            <PillLink to="/features" className="mt-6">Explore all features</PillLink>
          </div>
          <div data-reveal><NewBillMock avatar={IMG.avatar1} /></div>
          <figure data-reveal className="relative hidden overflow-hidden rounded-2xl lg:block">
            <img src={IMG.homeHappyClient} alt="" className="h-[22rem] w-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-petal via-petal/90 to-transparent p-4 pt-10 font-display text-lg leading-tight text-ink">Happy clients<br />Beautiful business <LuHeart className="inline fill-rose-400 text-rose-400" size={14} /></figcaption>
          </figure>
        </div>
        <ul className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {HOME_MODULES.map((m, i) => (
            <li key={m.title} data-reveal style={{ transitionDelay: `${i * 60}ms` }} className="text-center">
              <IconCircle name={m.icon} size="lg" className="bg-white" />
              <h3 className="mt-3 font-semibold text-ink">{m.title}</h3>
              <p className="mx-auto mt-1 max-w-[11rem] text-xs text-stone-600">{m.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
