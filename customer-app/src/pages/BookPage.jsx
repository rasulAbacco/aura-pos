/**
 * Book services: stylist (or any) → day → free time → note → request.
 * Free times come from the salon's opening hours and each stylist's bookings. The request holds the
 * slot straight away; the salon confirms or declines it and the customer sees that in My bookings.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { LuCalendarCheck, LuClock, LuUser, LuUsers, LuPartyPopper } from 'react-icons/lu';
import { api, errorMessage, newRequestId } from '../lib/api.js';
import { useApi, forgetCached } from '../lib/useApi.js';
import { dayKey, minutes, rupees, time, when } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { Button, ErrorBox, Field, Header, Page, Sheet, Spinner, cx } from '../components/ui.jsx';

const WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAYS_SHOWN = 21;
const part = (iso) => { const h = Number(new Date(iso).toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' })); return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; };

export default function BookPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const salon = useApi(`/salons/${slug}`);
  const s = salon.data;
  const branch = s?.branches.find((b) => b.id === params.get('branch')) ?? s?.branches[0];
  const serviceIds = (params.get('services') ?? '').split(',').filter(Boolean);
  const services = (s?.services ?? []).filter((x) => serviceIds.includes(x.id));
  const staff = (s?.staff ?? []).filter((x) => !x.branchId || x.branchId === branch?.id);

  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => { const d = new Date(Date.now() + i * 86400000); return { key: dayKey(d), date: d, wd: WEEK[d.getDay()] }; }), []);
  const isOpen = (d) => (branch?.businessHours?.[d.wd]?.length ?? 0) > 0;
  const [staffId, setStaffId] = useState('');
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const requestId = useRef(newRequestId());
  useEffect(() => { requestId.current = newRequestId(); }, [staffId, day, slot]); // a new choice is a new request

  // First open day as the default.
  useEffect(() => { if (branch && !day) setDay((days.find(isOpen) ?? days[0]).key); }, [branch]); // eslint-disable-line react-hooks/exhaustive-deps
  const slotsUrl = branch && day && services.length ? `/salons/${slug}/slots?branchId=${branch.id}&serviceIds=${serviceIds.join(',')}&date=${day}${staffId ? `&staffId=${staffId}` : ''}` : null;
  const slots = useApi(slotsUrl);
  useEffect(() => setSlot(null), [slotsUrl]);
  const groups = useMemo(() => (slots.data?.slots ?? []).reduce((m, x) => { (m[part(x.at)] ??= []).push(x); return m; }, {}), [slots.data]);

  if (salon.loading) return <><Header title="Book" /><Spinner /></>;
  if (!s) return <><Header title="Book" /><Page><ErrorBox onRetry={salon.reload}>{salon.error ?? 'Salon not found'}</ErrorBox></Page></>;
  if (!services.length) return <><Header title="Book" /><Page><ErrorBox>Pick at least one service first. <Link className="font-semibold underline" to={`/s/${slug}`}>Back to {s.name}</Link></ErrorBox></Page></>;

  const total = services.reduce((n, x) => n + x.durationMin, 0);
  const price = services.reduce((n, x) => n + Number(x.price), 0);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post('/bookings', { requestId: requestId.current, branchId: branch.id, serviceIds, startsAt: slot, staffId: staffId || null, notes: notes.trim() || undefined });
      forgetCached('/bookings');
      setDone(r.data.data);
    } catch (e) {
      toast(errorMessage(e), 'error');
      if (e?.response?.status === 409) { setSlot(null); slots.reload(); }
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen with-tabbar-action">
      <Header title="Book a visit" sub={`${s.name} · ${branch.name}`} />
      <Page className="md:mt-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_22rem] md:items-start">
        <aside className="space-y-3 md:sticky md:top-24 md:order-2">
        <section className="rounded-2xl bg-white p-4 ring-1 ring-blush">
          <ul className="space-y-1.5 text-sm">
            {services.map((x) => <li key={x.id} className="flex justify-between gap-3"><span>{x.name} <span className="text-stone-500">· {minutes(x.durationMin)}</span></span><span className="num font-medium">{rupees(x.price)}</span></li>)}
          </ul>
          <p className="mt-2 flex justify-between border-t border-dashed border-blush pt-2 text-sm font-semibold"><span className="flex items-center gap-1"><LuClock aria-hidden size={14} />{minutes(total)}</span><span className="num">{rupees(price)}{!s.pricesIncludeTax && ' + GST'}</span></p>
          <Link to={`/s/${slug}?branch=${branch.id}`} className="mt-2 inline-block text-xs font-semibold text-mauve">Change services</Link>
          <div className="mt-4 hidden md:block">
            <Button size="lg" className="w-full" disabled={!slot || busy} onClick={submit}>{busy ? 'Sending request…' : slot ? `Request ${when(slot)}` : 'Pick a time'}</Button>
            <p className="mt-2 text-xs text-stone-500">Your booking is a request until the salon confirms it. Pay at the salon after your visit.</p>
          </div>
        </section>
        </aside>
        <div className="space-y-6 md:order-1">

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><LuUser aria-hidden className="text-mauve" />Stylist</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Stylist">
            {[{ id: '', name: 'Any stylist', designation: 'First available' }, ...staff].map((x) => (
              <button key={x.id || 'any'} role="radio" aria-checked={staffId === x.id} onClick={() => setStaffId(x.id)}
                className={cx('min-w-[7.5rem] rounded-2xl px-3 py-2.5 text-left ring-1', staffId === x.id ? 'bg-mauve text-white ring-mauve' : 'bg-white ring-blush')}>
                <span className="flex items-center gap-1.5 text-sm font-semibold">{!x.id && <LuUsers aria-hidden size={14} />}{x.name}</span>
                <span className={cx('block text-xs', staffId === x.id ? 'text-white/80' : 'text-stone-500')}>{x.designation}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><LuCalendarCheck aria-hidden className="text-mauve" />Day</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Day">
            {days.map((d, i) => {
              const open = isOpen(d);
              return (
                <button key={d.key} role="radio" aria-checked={day === d.key} disabled={!open} onClick={() => setDay(d.key)}
                  className={cx('flex w-16 shrink-0 flex-col items-center rounded-2xl py-2.5 ring-1 disabled:opacity-40', day === d.key ? 'bg-mauve text-white ring-mauve' : 'bg-white ring-blush')}>
                  <span className="text-[11px] font-semibold uppercase">{i === 0 ? 'Today' : d.date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="num font-display text-xl font-semibold">{d.date.getDate()}</span>
                  <span className="text-[11px]">{open ? d.date.toLocaleDateString('en-IN', { month: 'short' }) : 'Closed'}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><LuClock aria-hidden className="text-mauve" />Time</h2>
          {slots.error && <ErrorBox onRetry={slots.reload}>{slots.error}</ErrorBox>}
          {slots.loading ? <Spinner label="Finding free times…" /> : slots.data && !slots.data.slots.length ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-stone-600 ring-1 ring-blush">{slots.data.closed ? 'The salon is closed this day.' : `No free time for ${minutes(total)} this day${staffId ? ' with this stylist' : ''}. Try another day${staffId ? ' or “Any stylist”' : ''}.`}</p>
          ) : Object.entries(groups).map(([label, list]) => (
            <div key={label} className="mb-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-7" role="radiogroup" aria-label={`${label} times`}>
                {list.map((x) => (
                  <button key={x.at} role="radio" aria-checked={slot === x.at} onClick={() => setSlot(x.at)}
                    className={cx('num rounded-xl py-2.5 text-sm font-semibold ring-1', slot === x.at ? 'bg-mauve text-white ring-mauve' : 'bg-white ring-blush hover:bg-petal')}>{time(x.at)}</button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <Field as="textarea" rows={2} label="Note for the salon (optional)" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Short layers, sensitive scalp" />
        <p className="text-xs text-stone-500 md:hidden">Your booking is a request until the salon confirms it. You pay at the salon after your visit. You can cancel in My bookings before it starts.</p>
        </div>
        </div>
      </Page>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-blush bg-white px-4 pt-3 md:hidden">
        <div className="mx-auto max-w-xl">
          <Button size="lg" className="w-full" disabled={!slot || busy} onClick={submit}>{busy ? 'Sending request…' : slot ? `Request ${when(slot)}` : 'Pick a time'}</Button>
        </div>
      </div>

      <Sheet open={!!done} onClose={() => nav('/bookings', { replace: true })} title="Request sent">
        {done && (
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-petal text-mauve"><LuPartyPopper size={30} aria-hidden /></span>
            <p className="font-semibold">{when(done.startsAt)}</p>
            <p className="text-sm text-stone-600">{done.services.map((x) => x.name).join(' + ')}{done.staffName ? ` with ${done.staffName}` : ''}</p>
            <p className="mt-3 text-sm text-stone-600">{s.name} will confirm your booking. You'll see it change to <b>Confirmed</b> in My bookings.</p>
            <div className="mt-5 grid gap-2">
              <Button size="lg" onClick={() => nav('/bookings', { replace: true })}>View my bookings</Button>
              <Button variant="ghost" onClick={() => nav(`/s/${slug}`, { replace: true })}>Back to {s.name}</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
