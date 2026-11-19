/**
 * Product page: photos, price (with MRP and % off), which shop has it in stock (with distance),
 * quantity, Add to cart / Buy now → pickup order. Details: benefits, description, how to use, ingredients.
 * Pickup only: customers collect at the shop and pay there.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LuPackage, LuStore, LuCheck, LuShoppingBag, LuChevronDown, LuNavigation, LuWallet, LuClock } from 'react-icons/lu';
import { useApi } from '../lib/useApi.js';
import { useCart } from '../lib/cart.jsx';
import { useLocation2, distanceKm, formatKm } from '../lib/location.jsx';
import { useToast } from '../components/Toast.jsx';
import { Gallery } from '../components/Gallery.jsx';
import { PriceLine, ProductCard } from '../components/ProductCard.jsx';
import { Button, ErrorBox, Header, Page, Sheet, Spinner, Stepper, cx } from '../components/ui.jsx';

function Details({ title, children, open: startOpen }) {
  const [open, setOpen] = useState(!!startOpen);
  if (!children) return null;
  return (
    <div className="border-b border-blush">
      <button aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-4 text-left font-semibold">{title}<LuChevronDown className={cx('transition-transform', open && 'rotate-180')} aria-hidden /></button>
      {open && <div className="whitespace-pre-line pb-4 text-sm leading-relaxed text-stone-700">{children}</div>}
    </div>
  );
}

export default function ProductPage() {
  const { slug, productId } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const d = useApi(`/salons/${slug}`);
  const cart = useCart();
  const loc = useLocation2();
  const [qty, setQty] = useState(1);
  const [swap, setSwap] = useState(null);
  const s = d.data;
  const p = s?.products.find((x) => x.id === productId);

  const shops = useMemo(() => (s?.branches ?? []).filter((b) => b.onlineOrders).map((b) => ({ ...b, left: p?.stock[b.id] ?? 0, km: distanceKm(loc.pos, { lat: b.latitude, lng: b.longitude }) }))
    .sort((a, b) => (b.left > 0) - (a.left > 0) || (a.km ?? 1e9) - (b.km ?? 1e9)), [s, p, loc.pos]);
  const branch = shops.find((b) => b.id === params.get('branch')) ?? shops[0];

  if (d.loading) return <><Header title="" /><Spinner /></>;
  if (!s || !p) return <><Header title="Product" /><Page><ErrorBox onRetry={d.reload}>{d.error ?? 'This product is no longer available.'} <Link to={`/s/${slug}?tab=products`} className="font-semibold underline">See the salon's products</Link></ErrorBox></Page></>;

  const left = branch?.left ?? 0;
  const ctx = { slug: s.slug, salonName: s.name, branchId: branch?.id, branchName: branch?.name };
  const already = cart.cart.slug === s.slug && cart.cart.branchId === branch?.id ? cart.cart.items.find((i) => i.itemId === p.id)?.quantity ?? 0 : 0;
  const maxQty = Math.max(0, Math.min(left, 20) - already);
  const add = (thenGo, replace = false) => {
    const ok = cart.setQty(ctx, { ...p, max: Math.min(left, 20) }, already + Math.min(qty, maxQty), { replace });
    if (!ok) { setSwap(thenGo); return; }
    toast(`${p.name} added to your cart`);
    if (thenGo) nav('/cart');
  };
  const highlights = (p.highlights ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
  const more = s.products.filter((x) => x.id !== p.id).sort((a, b) => (b.category === p.category) - (a.category === p.category)).slice(0, 4);

  return (
    <div className="min-h-screen pb-32 md:pb-10">
      <div className="md:hidden"><Header title={p.name} sub={`${s.name}`} /></div>
      <Page className="md:pt-6">
        <nav aria-label="Breadcrumb" className="mb-3 hidden text-sm text-stone-500 md:block"><Link to="/shop" className="hover:text-mauve">Shop</Link> / <Link to={`/s/${s.slug}?tab=products`} className="hover:text-mauve">{s.name}</Link> / <span className="text-ink">{p.name}</span></nav>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
          <Gallery images={p.images} alt={p.name}
            fallback={<div className="flex aspect-square items-center justify-center rounded-3xl bg-petal text-mauve/40"><LuPackage size={96} aria-hidden /></div>} />

          <div>
            {p.brand && <p className="text-sm font-bold uppercase tracking-wider text-mauve">{p.brand}</p>}
            <h1 className="mt-1 font-display text-2xl font-semibold leading-tight md:text-4xl">{p.name}</h1>
            <p className="mt-1 text-sm text-stone-500">{[p.size, p.category].filter(Boolean).join(' · ')}</p>
            <div className="mt-4"><PriceLine price={p.price} mrp={p.mrp} size="lg" /></div>
            <p className="text-xs text-stone-500">{s.pricesIncludeTax ? 'Inclusive of GST' : 'GST extra, as on your bill'} · final amount on your bill at the shop</p>

            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-blush">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><LuStore className="text-mauve" aria-hidden />Pick up at</p>
              {!shops.length ? <p className="text-sm text-stone-500">This salon isn't taking product orders in the app right now.</p> : (
                <ul className="space-y-2" role="radiogroup" aria-label="Shop for pickup">
                  {shops.map((b) => (
                    <li key={b.id}>
                      <button role="radio" aria-checked={b.id === branch.id} onClick={() => { const n = new URLSearchParams(params); n.set('branch', b.id); setParams(n, { replace: true }); setQty(1); }}
                        className={cx('flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1', b.id === branch.id ? 'bg-petal/60 ring-mauve' : 'ring-blush hover:bg-cream')}>
                        <span className={cx('flex h-5 w-5 items-center justify-center rounded-full ring-2', b.id === branch.id ? 'bg-mauve ring-mauve' : 'ring-blush')}>{b.id === branch.id && <LuCheck size={12} className="text-white" aria-hidden />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{b.name}{b.km != null && <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-medium text-stone-500"><LuNavigation size={10} aria-hidden />{formatKm(b.km)}</span>}</span>
                          <span className="block truncate text-xs text-stone-500">{b.address ?? b.city}</span>
                        </span>
                        <span className={cx('text-xs font-semibold', b.left === 0 ? 'text-rose-700' : b.left <= 3 ? 'text-amber-700' : 'text-emerald-700')}>{b.left === 0 ? 'Out of stock' : b.left <= 3 ? `Only ${b.left} left` : 'In stock'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {left > 0 && (
              <div className="mt-5 hidden items-center gap-3 md:flex">
                <Stepper label="Quantity" value={Math.min(qty, Math.max(1, maxQty))} max={Math.max(1, maxQty)} onChange={(v) => setQty(Math.max(1, v))} />
                <Button variant="secondary" size="lg" className="flex-1" disabled={!maxQty} onClick={() => add(false)}><LuShoppingBag aria-hidden />Add to cart</Button>
                <Button size="lg" className="flex-1" disabled={!maxQty} onClick={() => add(true)}>Buy now</Button>
              </div>
            )}
            {already > 0 && <p className="mt-2 text-sm text-emerald-700">{already} already in your cart. <Link to="/cart" className="font-semibold underline">View cart</Link></p>}

            <ul className="mt-5 grid gap-2 text-sm text-stone-600 sm:grid-cols-3">
              <li className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-blush"><LuStore className="text-mauve" aria-hidden />Pick up at the shop</li>
              <li className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-blush"><LuWallet className="text-mauve" aria-hidden />Pay when you collect</li>
              <li className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-blush"><LuClock className="text-mauve" aria-hidden />We tell you when it's ready</li>
            </ul>

            {highlights.length > 0 && (
              <ul className="mt-6 space-y-1.5">{highlights.map((h) => <li key={h} className="flex items-start gap-2 text-sm"><LuCheck className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />{h}</li>)}</ul>
            )}
            <div className="mt-4 border-t border-blush">
              <Details title="Description" open>{p.description}</Details>
              <Details title="How to use">{p.howToUse}</Details>
              <Details title="Ingredients">{p.ingredients}</Details>
            </div>
          </div>
        </div>

        {more.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 font-display text-2xl font-semibold">More from {s.name}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{more.map((x) => <li key={x.id}><ProductCard p={x} to={`/s/${s.slug}/p/${x.id}?branch=${branch?.id ?? ''}`} /></li>)}</ul>
          </section>
        )}
      </Page>

      {/* Phones: sticky buy bar */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-blush bg-white px-4 pt-3 md:hidden">
        {left > 0 ? (
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <Stepper label="Quantity" value={Math.min(qty, Math.max(1, maxQty))} max={Math.max(1, maxQty)} onChange={(v) => setQty(Math.max(1, v))} />
            <Button variant="secondary" className="flex-1" disabled={!maxQty} onClick={() => add(false)}>Add to cart</Button>
            <Button className="flex-1" disabled={!maxQty} onClick={() => add(true)}>Buy now</Button>
          </div>
        ) : <p className="pb-2 text-center text-sm font-semibold text-rose-700">{shops.length ? `Out of stock at ${branch?.name}` : 'Not available for app orders'}</p>}
      </div>

      <Sheet open={swap !== null} onClose={() => setSwap(null)} title="Start a new cart?"
        footer={<><Button variant="secondary" className="flex-1" onClick={() => setSwap(null)}>Keep current cart</Button><Button className="flex-1" onClick={() => { const go = swap; setSwap(null); add(go, true); }}>Start new cart</Button></>}>
        <p className="text-sm text-stone-600">Your cart has products from <b>{cart.cart.salonName}</b> ({cart.cart.branchName}). One order is picked up at one shop, so adding this starts a new cart.</p>
      </Sheet>
    </div>
  );
}
