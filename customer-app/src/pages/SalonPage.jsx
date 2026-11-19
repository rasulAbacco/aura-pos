/** One salon: photos, open now, distance; services to book, products to buy for pickup, branches and hours. */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LuCheck, LuPlus, LuClock, LuPhone, LuMapPin, LuShoppingBag, LuCalendarCheck, LuInfo, LuStore, LuNavigation } from 'react-icons/lu';
import { useApi } from '../lib/useApi.js';
import { useCart } from '../lib/cart.jsx';
import { useLocation2, distanceKm, formatKm, directionsUrl } from '../lib/location.jsx';
import { categoryLabel, DAY_NAMES } from '../lib/constants.js';
import { minutes, rupees } from '../lib/format.js';
import { salonHue } from '../components/SalonCard.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { Gallery } from '../components/Gallery.jsx';
import { Badge, Button, Empty, ErrorBox, Header, Page, Sheet, Spinner, Stepper, cx } from '../components/ui.jsx';
import { initials } from '../lib/format.js';

const groupBy = (list) => list.reduce((m, x) => { (m[x.category] ??= []).push(x); return m; }, {});
const WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Today's key and the time now in the salon's time zone. */
function nowIn(tz = 'Asia/Kolkata') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { day: parts.weekday.slice(0, 3).toLowerCase(), time: `${parts.hour}:${parts.minute}` };
}
/** "Open now · until 8 pm" / "Closed · opens 10 am". */
export function openStatus(hours, tz) {
  const { day, time } = nowIn(tz);
  const today = hours?.[day] ?? [];
  const cur = today.find(([o, c]) => time >= o && time < c);
  const fmt = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`; };
  if (cur) return { open: true, text: `Open now · until ${fmt(cur[1])}` };
  const later = today.find(([o]) => o > time);
  if (later) return { open: false, text: `Closed · opens ${fmt(later[0])}` };
  for (let i = 1; i <= 7; i += 1) {
    const k = WEEK[(WEEK.indexOf(day) + i) % 7];
    if (hours?.[k]?.length) return { open: false, text: `Closed · opens ${i === 1 ? 'tomorrow' : DAY_NAMES[k]} ${fmt(hours[k][0][0])}` };
  }
  return { open: false, text: 'Closed' };
}

export default function SalonPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const d = useApi(`/salons/${slug}`);
  const cart = useCart();
  const loc = useLocation2();
  const [picked, setPicked] = useState([]);
  const [swap, setSwap] = useState(null);
  const tab = params.get('tab') ?? 'services';
  const s = d.data;
  const withKm = useMemo(() => (s?.branches ?? []).map((b) => ({ ...b, km: distanceKm(loc.pos, { lat: b.latitude, lng: b.longitude }) })), [s, loc.pos]);
  const closest = loc.pos ? [...withKm].filter((b) => b.km != null).sort((a, b) => a.km - b.km)[0] : null;
  const branch = withKm.find((b) => b.id === params.get('branch')) ?? closest ?? withKm[0];
  const set = (k, v) => { const n = new URLSearchParams(params); n.set(k, v); setParams(n, { replace: true }); };

  const services = useMemo(() => groupBy(s?.services ?? []), [s]);
  const chosen = (s?.services ?? []).filter((x) => picked.includes(x.id));
  const minutesTotal = chosen.reduce((n, x) => n + x.durationMin, 0);
  const priceTotal = chosen.reduce((n, x) => n + Number(x.price), 0);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 5 ? p : [...p, id]));

  if (d.loading) return <><Header title="" /><Spinner /></>;
  if (d.error && !s) return <><Header title="Salon" /><Page><ErrorBox onRetry={d.reload}>{d.error}</ErrorBox></Page></>;
  if (!s) return null;

  const ctx = { slug: s.slug, salonName: s.name, branchId: branch?.id, branchName: branch?.name };
  const inCart = (id) => (cart.cart.slug === s.slug && cart.cart.branchId === branch?.id ? cart.cart.items.find((i) => i.itemId === id)?.quantity ?? 0 : 0);
  const setQty = (p, q) => { if (!cart.setQty(ctx, { ...p, max: p.stock[branch.id] ?? 0 }, q)) setSwap({ p, q }); };
  const status = branch ? openStatus(branch.businessHours, s.timezone) : null;
  const bookHref = `/s/${s.slug}/book?branch=${branch?.id}&services=${picked.join(',')}`;
  const bookBar = tab === 'services' && chosen.length > 0;
  const cartBar = tab === 'products' && cart.count > 0;

  const summary = (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-blush">
      <p className="font-display text-lg font-semibold">Your booking</p>
      {!chosen.length ? <p className="mt-1 text-sm text-stone-500">Tap <b>+</b> on the services you want (up to 5).</p> : (
        <>
          <ul className="mt-2 space-y-1 text-sm">{chosen.map((x) => <li key={x.id} className="flex justify-between gap-2"><span>{x.name}</span><span className="num">{rupees(x.price)}</span></li>)}</ul>
          <p className="mt-2 flex justify-between border-t border-dashed border-blush pt-2 text-sm font-semibold"><span>{minutes(minutesTotal)}</span><span className="num">{rupees(priceTotal)}{!s.pricesIncludeTax && ' + GST'}</span></p>
        </>
      )}
      <Button size="lg" className="mt-4 w-full" disabled={!chosen.length || !branch?.onlineBooking} onClick={() => nav(bookHref)}>Choose a time</Button>
      <p className="mt-2 text-xs text-stone-500">At {branch?.name}. Pay at the salon after your visit.</p>
    </div>
  );

  return (
    <div className={cx('min-h-screen', (bookBar || cartBar) ? 'with-tabbar-action' : 'pb-10')}>
      <Header title={s.name} sub={categoryLabel(s.category) ?? undefined} />
      <Page>
        <section className="grid grid-cols-1 gap-5 md:mt-4 md:grid-cols-[1.25fr_1fr] md:gap-8">
          <Gallery images={s.photos} alt={s.name} aspect="aspect-[16/10]"
            fallback={<div className={`flex aspect-[16/10] items-center justify-center rounded-3xl bg-gradient-to-br font-display text-6xl font-semibold text-white ${salonHue(s.name)}`}>{initials(s.name)}</div>} />
          <div className="flex flex-col">
            <div className="flex flex-wrap gap-1.5">
              {categoryLabel(s.category) && <Badge tone="mauve">{categoryLabel(s.category)}</Badge>}
              {status && <Badge tone={status.open ? 'green' : 'stone'}>{status.text}</Badge>}
              {branch?.km != null && <Badge tone="blue"><LuNavigation size={11} aria-hidden />{formatKm(branch.km)} away</Badge>}
            </div>
            {s.tagline && <p className="mt-3 text-stone-600">{s.tagline}</p>}
            {branch && <p className="mt-2 flex items-start gap-1.5 text-sm text-stone-600"><LuMapPin size={15} className="mt-0.5 shrink-0" aria-hidden />{branch.address ?? branch.city}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {branch?.phone && <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-mauve ring-1 ring-blush"><LuPhone size={14} aria-hidden />Call</a>}
              {branch && <a href={directionsUrl({ lat: branch.latitude, lng: branch.longitude, query: `${s.name} ${branch.address ?? ''} ${branch.city ?? ''}` }, loc.pos)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-mauve ring-1 ring-blush"><LuNavigation size={14} aria-hidden />Directions</a>}
            </div>
            {s.about && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-stone-700">{s.about}</p>}
            {withKm.length > 1 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">Branch</p>
                <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
                  {withKm.map((b) => (
                    <button key={b.id} onClick={() => set('branch', b.id)} aria-pressed={b.id === branch.id}
                      className={cx('whitespace-nowrap rounded-xl px-3.5 py-2 text-left text-sm ring-1', b.id === branch.id ? 'bg-mauve text-white ring-mauve' : 'bg-white ring-blush')}>
                      <b className="block">{b.name}</b>
                      <span className={cx('text-xs', b.id === branch.id ? 'text-white/80' : 'text-stone-500')}>{[b.city, b.km != null ? formatKm(b.km) : null].filter(Boolean).join(' · ') || b.address?.slice(0, 28)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div role="tablist" className="no-scrollbar sticky top-14 z-20 -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-blush bg-cream/95 px-4 backdrop-blur md:top-16 md:mx-0 md:px-0">
          {[['services', `Services (${s.services.length})`, LuCalendarCheck], ['products', `Products (${s.products.length})`, LuShoppingBag], ['info', 'Hours & branches', LuInfo]].map(([k, l, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => set('tab', k)}
              className={cx('flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold', tab === k ? 'border-mauve text-mauve' : 'border-transparent text-stone-500')}><Icon aria-hidden size={16} />{l}</button>
          ))}
        </div>

        {tab === 'services' && (
          <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-[1fr_20rem]">
            <section>
              {!branch?.onlineBooking && (
                <p className="mb-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"><LuInfo className="mt-0.5 shrink-0" aria-hidden />{branch?.name} takes bookings by phone.{branch?.phone && <a className="ml-auto font-semibold underline" href={`tel:${branch.phone}`}>Call</a>}</p>
              )}
              {!s.services.length ? <Empty icon={LuCalendarCheck} title="No services listed yet" /> : Object.entries(services).map(([cat, list]) => (
                <div key={cat} className="mb-5">
                  <h2 className="mb-2 font-display text-lg font-semibold">{cat}</h2>
                  <ul className="divide-y divide-blush overflow-hidden rounded-2xl bg-white ring-1 ring-blush">
                    {list.map((x) => {
                      const on = picked.includes(x.id);
                      return (
                        <li key={x.id}>
                          <button disabled={!branch?.onlineBooking} onClick={() => toggle(x.id)} aria-pressed={on} className={cx('flex w-full items-center gap-3 px-4 py-3.5 text-left transition disabled:cursor-default', on && 'bg-petal/50')}>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{x.name}</span>
                              {x.description && <span className="block text-xs text-stone-500">{x.description}</span>}
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-stone-500"><LuClock size={12} aria-hidden />{minutes(x.durationMin)}</span>
                            </span>
                            <span className="num font-semibold">{rupees(x.price)}</span>
                            {branch?.onlineBooking && <span className={cx('flex h-8 w-8 items-center justify-center rounded-full ring-1', on ? 'bg-mauve text-white ring-mauve' : 'text-mauve ring-blush')}>{on ? <LuCheck aria-label="Selected" /> : <LuPlus aria-label="Add" />}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {!s.pricesIncludeTax && s.services.length > 0 && <p className="text-xs text-stone-500">Prices exclude GST. Pay at the salon after your visit.</p>}
            </section>
            <aside className="hidden md:block"><div className="sticky top-32">{summary}</div></aside>
          </div>
        )}

        {tab === 'products' && (
          <section className="pt-4">
            {!branch?.onlineOrders
              ? <p className="mb-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900"><LuInfo className="mt-0.5 shrink-0" aria-hidden />{branch?.name} isn't taking product orders in the app right now.</p>
              : <p className="mb-3 flex items-start gap-2 rounded-2xl bg-white p-3 text-sm text-stone-600 ring-1 ring-blush"><LuStore className="mt-0.5 shrink-0 text-mauve" aria-hidden />Pick up at <b className="mx-1">{branch.name}</b> and pay at the shop. No home delivery.</p>}
            {!s.products.length ? <Empty icon={LuShoppingBag} title="No products listed yet" /> : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {s.products.map((p) => {
                  const left = branch?.onlineOrders ? p.stock[branch.id] ?? 0 : 0;
                  const q = inCart(p.id);
                  return (
                    <li key={p.id}>
                      <ProductCard p={p} to={`/s/${s.slug}/p/${p.id}?branch=${branch?.id}`}
                        stockNote={branch?.onlineOrders && <p className={cx('mt-1 text-xs font-medium', left === 0 ? 'text-rose-700' : left <= 3 ? 'text-amber-700' : 'text-emerald-700')}>{left === 0 ? 'Out of stock here' : left <= 3 ? `Only ${left} left` : 'In stock'}</p>}
                        action={left > 0 && (q ? <Stepper label={p.name} value={q} max={Math.min(left, 20)} onChange={(v) => setQty(p, v)} />
                          : <Button variant="secondary" size="sm" className="w-full" onClick={() => setQty(p, 1)}><LuPlus aria-hidden />Add to cart</Button>)} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {tab === 'info' && (
          <section className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-2">
            {withKm.map((b) => {
              const st = openStatus(b.businessHours, s.timezone);
              const today = nowIn(s.timezone).day;
              return (
                <article key={b.id} className="rounded-2xl bg-white p-4 ring-1 ring-blush">
                  <h2 className="flex flex-wrap items-center gap-2 font-semibold"><LuStore aria-hidden className="text-mauve" />{b.name}<Badge tone={st.open ? 'green' : 'stone'}>{st.text}</Badge>{b.km != null && <Badge tone="blue">{formatKm(b.km)}</Badge>}</h2>
                  {b.address && <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-600"><LuMapPin className="mt-0.5 shrink-0" size={14} aria-hidden />{b.address}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold text-mauve">
                    {b.phone && <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5"><LuPhone size={14} aria-hidden />{b.phone}</a>}
                    <a href={directionsUrl({ lat: b.latitude, lng: b.longitude, query: `${s.name} ${b.address ?? ''} ${b.city ?? ''}` }, loc.pos)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5"><LuNavigation size={14} aria-hidden />Directions</a>
                  </div>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {Object.keys(DAY_NAMES).map((k) => (
                      <div key={k} className={cx('contents', k === today && 'font-semibold')}>
                        <dt className={k === today ? 'text-ink' : 'text-stone-500'}>{DAY_NAMES[k]}</dt>
                        <dd className="num">{b.businessHours[k]?.length ? b.businessHours[k].map(([o, c]) => `${o}–${c}`).join(', ') : 'Closed'}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone={b.onlineBooking ? 'green' : 'stone'}>{b.onlineBooking ? 'App bookings' : 'Bookings by phone'}</Badge>
                    <Badge tone={b.onlineOrders ? 'blue' : 'stone'}>{b.onlineOrders ? 'Pickup orders' : 'No app orders'}</Badge>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </Page>

      {bookBar && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-blush bg-white px-4 pt-3 md:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{chosen.length} service{chosen.length === 1 ? '' : 's'} · {minutes(minutesTotal)}</p>
              <p className="num text-stone-600">{rupees(priceTotal)}{!s.pricesIncludeTax && ' + GST'}</p>
            </div>
            <Button size="lg" onClick={() => nav(bookHref)}>Choose time</Button>
          </div>
        </div>
      )}
      {cartBar && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-blush bg-white px-4 pt-3 md:bottom-6 md:left-auto md:right-6 md:rounded-2xl md:border-0 md:bg-transparent md:p-0">
          <Link to="/cart" className="mx-auto flex max-w-xl items-center justify-between gap-6 rounded-2xl bg-mauve px-5 py-3.5 font-semibold text-white shadow-xl">
            <span className="flex items-center gap-2"><LuShoppingBag aria-hidden />{cart.count} item{cart.count === 1 ? '' : 's'} · {rupees(cart.total)}</span><span>View cart →</span>
          </Link>
        </div>
      )}

      <Sheet open={!!swap} onClose={() => setSwap(null)} title="Start a new cart?"
        footer={<><Button variant="secondary" className="flex-1" onClick={() => setSwap(null)}>Keep current cart</Button><Button className="flex-1" onClick={() => { cart.setQty(ctx, { ...swap.p, max: swap.p.stock[branch.id] ?? 0 }, swap.q, { replace: true }); setSwap(null); }}>Start new cart</Button></>}>
        <p className="text-sm text-stone-600">Your cart has products from <b>{cart.cart.salonName}</b> ({cart.cart.branchName}). One order is picked up at one shop, so adding this starts a new cart.</p>
      </Sheet>
    </div>
  );
}
