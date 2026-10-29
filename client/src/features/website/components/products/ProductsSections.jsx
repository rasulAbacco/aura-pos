import { Link } from "react-router-dom";
import { LuArrowRight } from "react-icons/lu";
import { cx } from "../../../../utils/cx.js";
import {
  Eyebrow,
  PillLink,
  LeafSprig,
  IconCircle,
  SiteIcon,
  CheckList,
  SectionTitle,
} from "../common";
import { CUSTOM_SOLUTION_CHIPS, INDUSTRIES } from "../../utils/siteContent.js";
import { IMG } from "../../utils/siteImages.js";

const contactFor = (name) => `/contact?interest=${encodeURIComponent(name)}`;

/** "Visit Website" goes to the product's site when PRODUCTS[].url is set, otherwise to the contact form. */
export function VisitLink({ product, className, children = "Visit Website" }) {
  return product.url ? (
    <PillLink href={product.url} className={className}>
      {children}
    </PillLink>
  ) : (
    <PillLink to={contactFor(product.name)} className={className}>
      {children}
    </PillLink>
  );
}

export function ProductsHero() {
  const chips = [
    ["car", "Automotive", "left-[8%] top-[6%]"],
    ["grad", "Education", "right-[14%] top-[4%]"],
    ["cart", "Retail", "right-0 top-[38%]"],
    ["fork", "Restaurant", "right-[8%] bottom-[18%]"],
  ];
  return (
    <section className="relative -mt-[72px] overflow-hidden pt-[72px]">
      <img
        src={IMG.productsHeroDevices}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="hero-fade-left absolute inset-0 max-md:bg-cream/85" />
      <LeafSprig className="absolute -left-6 top-24 h-48 max-md:hidden" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-14 pt-10 md:grid-cols-[1fr_1.1fr]">
        <div className="fade-up">
          <Eyebrow>Our products</Eyebrow>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] text-ink md:text-[3.6rem]">
            Powerful Software Solutions for{" "}
            <span className="text-mauve">Different Industries</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-stone-700">
            Explore our business software portfolio and discover solutions
            designed for industry-specific operations and business needs.
          </p>
          <a
            href="#portfolio"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-mauve px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(123_40_67/.7)] hover:bg-mauve-deep"
          >
            Explore Our Solutions <LuArrowRight size={16} />
          </a>
        </div>
        {/* the devices are in the background photo; the industry chips float over it */}
        <div
          className="relative hidden min-h-[22rem] fade-up [animation-delay:.15s] sm:block"
          aria-hidden
        >
          {chips.map(([icon, label, pos], i) => (
            <span
              key={label}
              className={`absolute hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-lg sm:flex ${pos} ${i % 2 ? "float-slower" : "float-slow"}`}
            >
              <SiteIcon name={icon} size={16} className="text-mauve" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function IndustryFilter({ value, onChange }) {
  return (
    <div
      className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3 px-5 py-8"
      role="tablist"
      aria-label="Filter by industry"
    >
      {INDUSTRIES.map((ind) => (
        <button
          key={ind.id}
          type="button"
          role="tab"
          aria-selected={value === ind.id}
          onClick={() => onChange(ind.id)}
          className={cx(
            "flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold transition",
            value === ind.id
              ? "bg-mauve text-white shadow"
              : "bg-white text-ink ring-1 ring-blush hover:ring-mauve/40",
          )}
        >
          {ind.icon && <SiteIcon name={ind.icon} size={15} />}
          {ind.label}
        </button>
      ))}
    </div>
  );
}

export function ProductRow({ product, index }) {
  const flip = index % 2 === 1;
  return (
    <article className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-8 md:grid-cols-2 md:gap-12">
      <img
        data-reveal
        src={IMG[product.img]}
        alt=""
        className={cx(
          "h-72 w-full rounded-2xl object-cover shadow-lg",
          flip && "md:order-2",
        )}
      />
      <div data-reveal className={flip ? "md:order-1" : ""}>
        <div className="flex items-center gap-4">
          <IconCircle name={product.icon} size="lg" />
          <div>
            <h2 className="font-display text-3xl text-ink">{product.name}</h2>
            <p className="text-sm text-stone-600">{product.subtitle}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          {product.body}
        </p>
        <CheckList
          items={product.points}
          columns={2}
          className="mt-4 !text-xs"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <VisitLink product={product} />
          <PillLink
            to={contactFor(product.name)}
            variant="outline"
            arrow={false}
          >
            Learn More
          </PillLink>
        </div>
      </div>
    </article>
  );
}

export function CustomSolutions() {
  return (
    <section id="custom" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-10">
      <div
        data-reveal
        className="relative grid items-center gap-8 overflow-hidden rounded-3xl bg-petal/80 p-8 md:grid-cols-2 md:p-12"
      >
        <LeafSprig className="absolute left-[46%] top-2 h-36 max-md:hidden" />
        <div className="relative">
          <Eyebrow>Custom solutions</Eyebrow>
          <h2 className="mt-4 font-display text-4xl leading-tight text-ink">
            Your Business Is Unique.
            <br />
            Your Software Should Be Too.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            We develop custom business software tailored to your specific needs.
            From CRM and ERP systems to specialized billing, inventory, and
            operations management tools — we create solutions that fit your
            business processes and help you work more efficiently.
          </p>
          <PillLink to={contactFor("Custom Solution")} className="mt-6">
            Request a Custom Solution
          </PillLink>
        </div>
        <div className="relative">
          <img
            src={IMG.productsCustomSolutions}
            alt=""
            className="h-72 w-full rounded-2xl object-cover"
          />
          {CUSTOM_SOLUTION_CHIPS.map(([icon, label], i) => (
            <span
              key={label}
              className={cx(
                "absolute hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-ink shadow-lg sm:flex",
                [
                  "left-0 top-6",
                  "right-0 top-2",
                  "right-[-0.5rem] top-1/2",
                  "right-6 bottom-4",
                ][i],
                i % 2 ? "float-slower" : "float-slow",
              )}
            >
              <SiteIcon name={icon} size={15} className="text-mauve" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductOverview({ products }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <SectionTitle
        title="Product Overview"
        subtitle="Compare our software products and find the right solution for your business."
      />
      <div className="mt-8 overflow-x-auto rounded-2xl border border-blush bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-petal/50 text-left text-xs text-ink">
            <tr>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-4 font-semibold">Industry</th>
              <th className="px-4 font-semibold">Main Purpose</th>
              <th className="px-4 font-semibold">Website</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blush/60">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3">
                    <img
                      src={IMG[p.img]}
                      alt=""
                      className="h-10 w-14 rounded-md object-cover"
                    />
                    <b className="text-ink">{p.name}</b>
                  </span>
                </td>
                <td className="px-4 text-stone-600">{p.industryLabel}</td>
                <td className="px-4 text-stone-600">{p.purpose}</td>
                <td className="px-4">
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-mauve"
                    >
                      Visit Website <LuArrowRight size={14} />
                    </a>
                  ) : (
                    <Link
                      to={contactFor(p.name)}
                      className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-mauve"
                    >
                      Visit Website <LuArrowRight size={14} />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DarkCta({ image }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div
        data-reveal
        className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-[#4a1428] via-mauve-deep to-mauve text-white"
      >
        <img
          src={image}
          alt=""
          className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-80 max-md:hidden"
        />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-mauve-deep to-transparent max-md:hidden" />
        <div className="relative max-w-xl px-8 py-10 md:px-12">
          <h2 className="font-display text-3xl md:text-4xl">
            Not Sure Which Solution Fits Your Business?
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Contact our team to explore our products or discuss a custom-built
            solution.
          </p>
          <PillLink to="/contact" variant="light" className="mt-6">
            Talk to Our Team
          </PillLink>
        </div>
      </div>
    </section>
  );
}
