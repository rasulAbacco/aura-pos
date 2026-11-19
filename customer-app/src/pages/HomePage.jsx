/** Explore salons: search, salon type, city, sort by distance from the customer's location. */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  LuSearch,
  LuX,
  LuStore,
  LuShoppingBag,
  LuMapPin,
  LuLoaderCircle,
  LuArrowRight,
} from "react-icons/lu";
import { useApi } from "../lib/useApi.js";
import { useAuth } from "../lib/auth.jsx";
import { useCart } from "../lib/cart.jsx";
import { useLocation2, nearest, formatKm } from "../lib/location.jsx";
import { CATEGORIES } from "../lib/constants.js";
import { rupees } from "../lib/format.js";
import { SalonCard } from "../components/SalonCard.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { Empty, ErrorBox, Page, cx } from "../components/ui.jsx";
import logo from "../assets/logo-full.png";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** "Use my location" button with its states (shared with the Shop page). */
export function LocationButton({ compact }) {
  const loc = useLocation2();
  const msg = {
    denied: "Location is blocked. Allow it for this site/app in settings.",
    error: "Couldn’t get your location. Try again.",
    unsupported: "This device can’t share its location.",
  }[loc.status];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={loc.request}
        disabled={loc.status === "locating"}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition",
          loc.pos
            ? "bg-white text-mauve ring-mauve/40"
            : "bg-mauve text-white ring-mauve hover:bg-mauve-deep",
        )}
      >
        {loc.status === "locating" ? (
          <LuLoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <LuMapPin aria-hidden />
        )}
        {loc.status === "locating"
          ? "Finding you…"
          : loc.pos
          ? "Update my location"
          : "Use my current location"}
      </button>
      {loc.pos && !compact && (
        <span className="text-xs text-stone-500">
          Showing distance from you
          {loc.pos.accuracy ? ` (±${loc.pos.accuracy} m)` : ""} ·{" "}
          <button onClick={loc.clear} className="font-semibold underline">
            Forget
          </button>
        </span>
      )}
      {msg && (
        <span role="alert" className="text-xs text-rose-700">
          {msg}
        </span>
      )}
    </div>
  );
}

export default function HomePage() {
  const { account } = useAuth();
  const { count, total } = useCart();
  const loc = useLocation2();
  const [params, setParams] = useSearchParams();
  const category = params.get("type") ?? "";
  const city = params.get("city") ?? "";
  const sort = params.get("sort") ?? (loc.pos ? "near" : "name");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [query, setQuery] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const n = new URLSearchParams(params);
    if (query) n.set("q", query);
    else n.delete("q");
    if (n.toString() !== params.toString()) setParams(n, { replace: true });
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };
  const url = `/salons?${new URLSearchParams(
    Object.entries({ q: query, category, city }).filter(([, v]) => v),
  )}`;
  const salons = useApi(url);
  const allSalons = useApi("/salons");
  const products = useApi("/products");
  const cities = useMemo(
    () => [...new Set((allSalons.data ?? []).flatMap((s) => s.cities))].sort(),
    [allSalons.data],
  );

  const list = useMemo(() => {
    const rows = (salons.data ?? []).map((s) => ({
      s,
      km: nearest(loc.pos, s.points)?.km ?? null,
    }));
    if (sort === "near" && loc.pos)
      rows.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
    return rows;
  }, [salons.data, loc.pos, sort]);
  const nearbyProducts = useMemo(() => {
    const rows = (products.data ?? []).map((p) => ({
      p,
      km: nearest(loc.pos, p.branches)?.km ?? null,
    }));
    if (loc.pos) rows.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
    return rows.slice(0, 8);
  }, [products.data, loc.pos]);

  return (
    <div className="with-tabbar min-h-screen">
      <section className="safe-top bg-gradient-to-br from-petal via-cream to-[#f3e1dc]">
        <Page className="pb-6 pt-5 md:pb-12 md:pt-14">
          <div className="flex items-center justify-between md:hidden">
            <img src={logo} alt="Salora Glam" className="h-8 w-auto" />
            {!account && (
              <Link
                to="/login"
                className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-mauve ring-1 ring-blush"
              >
                Sign in
              </Link>
            )}
          </div>
          <div className="mt-5 max-w-2xl md:mt-0">
            <p className="hidden text-sm font-semibold uppercase tracking-[0.2em] text-mauve md:block">
              {account?.name
                ? `${greeting()}, ${account.name.split(" ")[0]}`
                : "Salons & spas near you"}
            </p>
            <h1 className="font-display text-[1.75rem] font-semibold leading-tight md:mt-2 md:text-5xl">
              <span className="md:hidden">
                {account?.name
                  ? `${greeting()}, ${account.name.split(" ")[0]}`
                  : "Find your salon"}
              </span>
              <span className="hidden md:inline">
                Book your next glow-up, pick up your favourites.
              </span>
            </h1>
            <p className="mt-1 text-sm text-stone-600 md:mt-3 md:text-lg">
              See real prices, book a free time, order products and collect them
              at the shop.
            </p>
          </div>
          <div className="mt-4 flex max-w-3xl flex-col gap-3 md:mt-8">
            <label className="relative block">
              <span className="sr-only">Search salons</span>
              <LuSearch
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                aria-hidden
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Salon, service or area"
                className="w-full rounded-2xl border border-blush bg-white py-3.5 pl-11 pr-10 shadow-sm outline-none focus:border-mauve focus:ring-2 focus:ring-mauve/20 md:py-4 md:text-lg"
              />
              {q && (
                <button
                  aria-label="Clear search"
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-petal"
                >
                  <LuX />
                </button>
              )}
            </label>
            <LocationButton />
          </div>
        </Page>
      </section>

      <div className="no-scrollbar sticky top-0 z-20 overflow-x-auto bg-cream/95 py-2 backdrop-blur md:top-16">
        <div
          className="mx-auto flex w-max gap-2 px-4 md:w-full md:max-w-6xl md:flex-wrap md:px-6"
          role="radiogroup"
          aria-label="Salon type"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              role="radio"
              aria-checked={category === c.value}
              onClick={() => set("type", c.value)}
              className={cx(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 transition",
                category === c.value
                  ? "bg-mauve text-white ring-mauve"
                  : "bg-white text-stone-700 ring-blush hover:bg-petal",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Page className="pt-3">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          {salons.data && (
            <p className="font-medium text-stone-500">
              {salons.data.length} salon{salons.data.length === 1 ? "" : "s"}
            </p>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {cities.length > 1 && (
              <select
                aria-label="City"
                value={city}
                onChange={(e) => set("city", e.target.value)}
                className="rounded-xl border border-blush bg-white px-3 py-1.5 text-sm"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
            <select
              aria-label="Sort"
              value={sort}
              onChange={(e) => set("sort", e.target.value)}
              className="rounded-xl border border-blush bg-white px-3 py-1.5 text-sm"
            >
              <option value="near" disabled={!loc.pos}>
                Nearest first{loc.pos ? "" : " (use location)"}
              </option>
              <option value="name">A–Z</option>
            </select>
          </div>
        </div>
        {salons.error && (
          <ErrorBox onRetry={salons.reload}>{salons.error}</ErrorBox>
        )}
        {salons.loading ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-3xl bg-white/70"
              />
            ))}
          </div>
        ) : salons.data && !salons.data.length ? (
          <Empty
            icon={LuStore}
            title="No salons found"
            action={
              query || category || city ? (
                <button
                  onClick={() => {
                    setQ("");
                    setParams({}, { replace: true });
                  }}
                  className="font-semibold text-mauve"
                >
                  Clear filters
                </button>
              ) : null
            }
          >
            {query || category || city
              ? "Try another name, service or area."
              : "Salons will appear here as they join Salora Glam."}
          </Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(({ s, km }) => (
              <li key={s.slug}>
                <SalonCard s={s} km={km} />
              </li>
            ))}
          </ul>
        )}

        {nearbyProducts.length > 0 && (
          <section className="mt-12">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  {loc.pos ? "Products near you" : "Shop salon products"}
                </h2>
                <p className="text-sm text-stone-500">
                  Order now, pick up at the shop and pay there. No delivery.
                </p>
              </div>
              <Link
                to="/shop"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-mauve"
              >
                See all <LuArrowRight aria-hidden />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {nearbyProducts.map(({ p, km }) => (
                <li key={p.id}>
                  <ProductCard
                    p={p}
                    km={km}
                    salonName={p.salon.name}
                    to={`/s/${p.salon.slug}/p/${p.id}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </Page>

      {count > 0 && (
        <Link
          to="/cart"
          className="animate-rise fixed inset-x-4 z-20 mx-auto flex max-w-xl items-center justify-between rounded-2xl bg-ink px-5 py-3.5 text-white shadow-xl md:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
        >
          <span className="flex items-center gap-2 font-semibold">
            <LuShoppingBag aria-hidden />
            {count} item{count === 1 ? "" : "s"} · {rupees(total)}
          </span>
          <span className="text-sm font-semibold">View cart →</span>
        </Link>
      )}
      {loc.pos && list[0]?.km != null && (
        <span className="sr-only">
          Nearest salon is {formatKm(list[0].km)} away
        </span>
      )}
    </div>
  );
}
