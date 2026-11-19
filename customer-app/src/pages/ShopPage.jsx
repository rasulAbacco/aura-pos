/** Shop: beauty products from every salon, in stock for pickup. Sort by distance or price. No delivery. */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuSearch, LuX, LuPackage, LuStore } from 'react-icons/lu';
import { useApi } from '../lib/useApi.js';
import { useLocation2, nearest } from '../lib/location.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { Empty, ErrorBox, Header, Page } from '../components/ui.jsx';
import { LocationButton } from './HomePage.jsx';

export default function ShopPage() {
  const loc = useLocation2();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(q);
  const sort = params.get('sort') ?? (loc.pos ? 'near' : 'name');
  useEffect(() => { const t = setTimeout(() => setQuery(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { const n = new URLSearchParams(params); if (query) n.set('q', query); else n.delete('q'); if (n.toString() !== params.toString()) setParams(n, { replace: true }); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps
  const products = useApi(`/products${query ? `?q=${encodeURIComponent(query)}` : ''}`);

  const rows = useMemo(() => {
    const r = (products.data ?? []).map((p) => ({ p, near: nearest(loc.pos, p.branches) }));
    const by = {
      near: (a, b) => (a.near?.km ?? 1e9) - (b.near?.km ?? 1e9),
      low: (a, b) => Number(a.p.price) - Number(b.p.price),
      high: (a, b) => Number(b.p.price) - Number(a.p.price),
      name: (a, b) => a.p.name.localeCompare(b.p.name),
    }[sort === 'near' && !loc.pos ? 'name' : sort];
    return r.sort(by);
  }, [products.data, loc.pos, sort]);

  return (
    <div className="with-tabbar min-h-screen">
      <Header title="Shop" sub="Order online · pick up at the shop · pay there" back={false} />
      <Page>
        <div className="mt-1 flex flex-col gap-3 md:mt-4 md:flex-row md:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search products</span>
            <LuSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Shampoo, serum, brand or salon" className="w-full rounded-2xl border border-blush bg-white py-3 pl-11 pr-10 outline-none focus:border-mauve focus:ring-2 focus:ring-mauve/20" />
            {q && <button aria-label="Clear search" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-petal"><LuX /></button>}
          </label>
          <select aria-label="Sort" value={sort} onChange={(e) => { const n = new URLSearchParams(params); n.set('sort', e.target.value); setParams(n, { replace: true }); }} className="rounded-2xl border border-blush bg-white px-3 py-3 text-sm">
            <option value="near" disabled={!loc.pos}>Nearest first{loc.pos ? '' : ' (use location)'}</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <div className="mt-3"><LocationButton /></div>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-white p-3 text-sm text-stone-600 ring-1 ring-blush"><LuStore className="mt-0.5 shrink-0 text-mauve" aria-hidden />Every product is collected from the salon that sells it. There is no home delivery yet — you pay at the shop when you pick it up.</p>

        {products.error && <ErrorBox onRetry={products.reload}>{products.error}</ErrorBox>}
        {products.loading ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/70" />)}</div>
        ) : !rows.length ? (
          <Empty icon={LuPackage} title={query ? 'No products match' : 'No products yet'}>{query ? 'Try another name or brand.' : 'Products appear here when salons add them for pickup.'}</Empty>
        ) : (
          <>
            <p className="mb-2 mt-4 text-xs font-medium text-stone-500">{rows.length} product{rows.length === 1 ? '' : 's'}</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {rows.map(({ p, near }) => (
                <li key={p.id}><ProductCard p={p} km={near?.km ?? null} salonName={near ? `${p.salon.name} · ${near.point.name}` : p.salon.name} to={`/s/${p.salon.slug}/p/${p.id}${near ? `?branch=${near.point.branchId}` : ''}`} /></li>
              ))}
            </ul>
          </>
        )}
      </Page>
    </div>
  );
}
