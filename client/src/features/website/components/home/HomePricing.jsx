import { Eyebrow } from '../common';
import { PlanCards } from '../pricing/PlanCards.jsx';
import { BillingToggle } from '../pricing/BillingToggle.jsx';
import { usePlans } from '../../hooks/usePlans.js';

export function HomePricing() {
  const { shown, interval, setInterval, hasAnnual, saving } = usePlans();
  return (
    <section className="bg-petal/50">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:py-20 lg:grid-cols-[0.75fr_2fr]">
        <div data-reveal>
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-4 font-display text-4xl leading-tight text-ink md:text-5xl">Simple plans for every salon.</h2>
          <p className="mt-4 text-sm text-stone-600">Choose a plan that fits your business. Upgrade anytime as you grow.</p>
          {hasAnnual && <BillingToggle className="mt-6" value={interval} onChange={setInterval} saving={saving} />}
        </div>
        <div>
          <PlanCards plans={shown} size="compact" />
          <p className="mt-6 text-center text-xs text-stone-500">Prices are charged, including applicable GST. Every plan starts with a 14-day free trial.</p>
        </div>
      </div>
    </section>
  );
}
