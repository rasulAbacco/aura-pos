/** Pricing: hero, plan cards and comparison (all from the server's plan list), FAQ, call to action. */
import { Link } from "react-router-dom";
import { LuArrowRight } from "react-icons/lu";
import { usePageMeta } from "./hooks/usePageMeta.js";
import { useReveal } from "./hooks/useReveal.js";
import { usePlans } from "./hooks/usePlans.js";
import {
  CtaBanner,
  FaqAccordion,
  LeafSprig,
  SectionTitle,
  SiteIcon,
} from "./components/common";
import { PricingHero } from "./components/pricing/PricingHero.jsx";
import { PlanCards } from "./components/pricing/PlanCards.jsx";
import { BillingToggle } from "./components/pricing/BillingToggle.jsx";
import { ComparePlans } from "./components/pricing/ComparePlans.jsx";
import { PRICING_FAQ, PRICING_STRIP } from "./utils/siteContent.js";
import { IMG } from "./utils/siteImages.js";

export default function PricingPage() {
  usePageMeta(
    "Pricing",
    "Plans for single salons, growing salons and multi-branch chains. 14-day free trial.",
  );
  const ref = useReveal();
  const { shown, interval, setInterval, hasAnnual, saving } = usePlans();
  const toggle = hasAnnual && (
    <BillingToggle value={interval} onChange={setInterval} saving={saving} />
  );
  return (
    <div ref={ref} className="relative overflow-x-clip">
      <PricingHero />

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6">
        <SectionTitle
          title="Simple plans for every salon"
          subtitle="Choose a plan based on your business size. Upgrade anytime as you grow."
        />
        {toggle && <div className="mt-6 flex justify-center">{toggle}</div>}
        <div className="mt-12">
          <PlanCards plans={shown} />
        </div>
        <p className="mt-8 text-center text-xs text-stone-500">
          Prices are charged, including applicable GST. All plans include a
          14-day free trial. No credit card required.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14">
        <ul className="grid gap-6 rounded-2xl bg-petal/70 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_STRIP.map(([icon, t, b]) => (
            <li key={t} className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-mauve">
                <SiteIcon name={icon} />
              </span>
              <span>
                <b className="block text-sm text-ink">{t}</b>
                <span className="text-xs text-stone-600">{b}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-3xl text-ink">Compare plans</h2>
          {toggle}
        </div>
        <ComparePlans plans={shown} />
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-16">
        <LeafSprig className="absolute -left-28 top-0 h-40 max-xl:hidden" />
        <LeafSprig
          flip
          className="absolute -right-28 top-10 h-40 max-xl:hidden"
        />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-3xl text-ink">
            Frequently asked questions
          </h2>
          <Link
            to="/contact#faq"
            className="flex items-center gap-1 text-sm font-semibold text-mauve"
          >
            View all FAQs <LuArrowRight size={15} />
          </Link>
        </div>
        <FaqAccordion items={PRICING_FAQ} columns={2} defaultOpen={-1} />
      </section>

      <CtaBanner
        eyebrow="Ready to get started?"
        title="Start your free 14-day trial today."
        body="No credit card needed. Set up your salon, add your services and staff, and start billing in minutes."
        cta="Start free trial"
        image={IMG.ctaSpaCandles}
      />
    </div>
  );
}
