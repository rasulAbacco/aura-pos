/**
 * App requests: what customers asked for in the Salora Glam customer app, for the branch in the top bar.
 *   Booking requests → Confirm or Decline (with a reason the customer sees). Confirmed bookings are
 *   billed from here or from Queue & chairs as usual.
 *   Product orders  → Confirm → Mark ready → Bill at counter (which completes the order and takes stock).
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LuCalendarCheck, LuShoppingBag, LuPhone, LuClock, LuCheck, LuX, LuPackageCheck, LuReceipt, LuSmartphone, LuBellRing, LuVolume2 } from 'react-icons/lu';
import { alertPrefs, saveAlertPrefs, playChime, unlockAudio } from '../../lib/alertSound.js';
import { api, errorMessage } from '../../lib/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { refreshOnlineSummary, useOnlineSummary } from '../../lib/onlineSummary.js';
import { money, money0, time, date, dateTime } from '../../utils/format.js';
import { PageHeader, ErrorNote, Skeleton, Empty, Badge, Button } from '../../components/ui';
import { Modal } from '../../components/modals';
import { Field } from '../../components/forms';
import { cx } from '../../utils/cx.js';

const BOOKING_STATUS = {
  BOOKED: ['Waiting for you', 'amber'], CONFIRMED: ['Confirmed', 'green'], WAITING: ['Arrived', 'blue'], CHECKED_IN: ['Checked in', 'blue'],
  IN_SERVICE: ['In service', 'blue'], COMPLETED: ['Completed', 'stone'], CANCELLED: ['Cancelled', 'rose'], NO_SHOW: ['No-show', 'rose'],
};
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ORDER_STATUS = { PLACED: ['New', 'amber'], CONFIRMED: ['Confirmed', 'blue'], READY: ['Ready for pickup', 'green'], COLLECTED: ['Collected', 'stone'], CANCELLED: ['Cancelled', 'rose'] };

function Stat({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs text-stone-500"><Icon aria-hidden size={14} />{label}</p>
      <p className={cx('num mt-1 text-2xl font-extrabold', tone === 'warn' && value > 0 ? 'text-rose-800' : 'text-stone-900')}>{value}</p>
      {note && <p className="text-xs text-stone-500">{note}</p>}
    </div>
  );
}

const whenLabel = (d) => {
  const day = new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return `${day === today ? 'Today' : day === tomorrow ? 'Tomorrow' : new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time(d)}`;
};
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : dateTime(d);
};

function BookingCard({ b, canManage, canBill, onConfirm, onDecline, busy }) {
  const [label, tone] = BOOKING_STATUS[b.status] ?? [b.status, 'stone'];
  const total = b.services.reduce((n, s) => n + (new Date(s.endsAt) - new Date(s.startsAt)) / 60000, 0);
  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-stone-900">
            <LuClock aria-hidden className="text-rose-700" />{whenLabel(b.startsAt)}
            <span className="text-sm font-normal text-stone-500">· {total} min</span>
            <Badge tone={tone}>{label}</Badge>
          </p>
          <p className="mt-1 text-sm text-stone-700">{b.services.map((s) => s.name).join(' + ')}{b.staff ? <span className="text-stone-500"> · with {b.staff.name}</span> : null}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <b>{b.customer.name}</b>
            <a href={`tel:${b.customer.phone}`} className="inline-flex items-center gap-1 text-rose-700 hover:underline"><LuPhone size={13} aria-hidden />{b.customer.phone}</a>
            <span className="text-xs text-stone-500">{b.customer.visitCount ? `${b.customer.visitCount} past visit${b.customer.visitCount === 1 ? '' : 's'}` : 'New client'}</span>
          </p>
          {b.notes && <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">“{b.notes}”</p>}
          {b.cancelReason && <p className="mt-2 text-sm text-rose-700">{b.cancelReason}</p>}
          <p className="mt-2 text-xs text-stone-400">Requested {ago(b.requestedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && b.status === 'BOOKED' && <>
            <Button variant="primary" size="sm" disabled={busy} onClick={() => onConfirm(b)}><LuCheck aria-hidden /> Confirm</Button>
            <Button size="sm" disabled={busy} onClick={() => onDecline(b)}><LuX aria-hidden /> Decline</Button>
          </>}
          {canManage && b.status === 'CONFIRMED' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDecline(b)}>Cancel</Button>}
          {canBill && ['BOOKED', 'CONFIRMED', 'WAITING', 'CHECKED_IN', 'IN_SERVICE'].includes(b.status) && (
            <Link to={`/app/pos/quick?appointment=${b.firstAppointmentId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"><LuReceipt aria-hidden /> Bill</Link>
          )}
        </div>
      </div>
    </li>
  );
}

function OrderCard({ o, canRespond, canBill, onStatus, onCancel, busy }) {
  const [label, tone] = ORDER_STATUS[o.status] ?? [o.status, 'stone'];
  const open = ['PLACED', 'CONFIRMED', 'READY'].includes(o.status);
  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-stone-900">Order {o.number}<Badge tone={tone}>{label}</Badge></p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
            <b>{o.customer.name}</b>
            <a href={`tel:${o.customer.phone}`} className="inline-flex items-center gap-1 text-rose-700 hover:underline"><LuPhone size={13} aria-hidden />{o.customer.phone}</a>
          </p>
          <ul className="mt-2 space-y-0.5 text-sm text-stone-700">
            {o.lines.map((l) => <li key={l.itemId} className="flex gap-3"><span className="num w-8 text-right text-stone-500">{l.quantity}×</span><span className="flex-1">{l.name}</span><span className="num">{money(Number(l.unitPrice) * l.quantity)}</span></li>)}
          </ul>
          <p className="mt-1 text-sm"><span className="text-stone-500">Estimate at list prices:</span> <b className="num">{money(o.itemsTotal)}</b> <span className="text-xs text-stone-500">· paid at pickup</span></p>
          {o.notes && <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">“{o.notes}”</p>}
          {o.cancelReason && <p className="mt-2 text-sm text-rose-700">{o.cancelledBy === 'CUSTOMER' ? 'Cancelled by customer' : 'Cancelled by salon'}: {o.cancelReason}</p>}
          <p className="mt-2 text-xs text-stone-400">Placed {ago(o.createdAt)}</p>
        </div>
        {open && (canRespond || canBill) && (
          <div className="flex flex-wrap gap-2">
            {canRespond && o.status === 'PLACED' && <Button size="sm" disabled={busy} onClick={() => onStatus(o, 'CONFIRMED')}><LuCheck aria-hidden /> Confirm</Button>}
            {canRespond && o.status !== 'READY' && <Button size="sm" disabled={busy} onClick={() => onStatus(o, 'READY')}><LuPackageCheck aria-hidden /> Mark ready</Button>}
            {canBill && <Link to={`/app/pos/quick?order=${o.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-800"><LuReceipt aria-hidden /> Bill at counter</Link>}
            {canRespond && <Button size="sm" variant="ghost" disabled={busy} onClick={() => onCancel(o)}>Cancel</Button>}
          </div>
        )}
      </div>
    </li>
  );
}

/** Alert sound on/off, reminders, test, and desktop pop-ups — saved on this device. */
function AlertSettings() {
  const [p, setP] = useState(alertPrefs);
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const update = (patch) => { const n = { ...p, ...patch }; setP(n); saveAlertPrefs(n); };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5 font-semibold text-stone-800"><LuBellRing aria-hidden className="text-rose-700" />New request alert</span>
      <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-rose-700" checked={p.sound} onChange={(e) => update({ sound: e.target.checked })} />Sound</label>
      <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-rose-700" checked={p.remind} disabled={!p.sound} onChange={(e) => update({ remind: e.target.checked })} />Remind every 3 min while waiting</label>
      <label className="flex items-center gap-2">Volume<input type="range" min="0.1" max="1" step="0.1" value={p.volume} disabled={!p.sound} onChange={(e) => update({ volume: Number(e.target.value) })} className="w-24 accent-rose-700" aria-label="Alert volume" /></label>
      <Button size="sm" variant="ghost" onClick={async () => { await unlockAudio(); playChime(); }}><LuVolume2 aria-hidden /> Test sound</Button>
      {perm === 'default' && <Button size="sm" variant="ghost" onClick={async () => setPerm(await Notification.requestPermission())}>Show pop-ups when this tab is in the background</Button>}
      {perm === 'granted' && <span className="text-xs text-emerald-700">Background pop-ups on</span>}
      {perm === 'denied' && <span className="text-xs text-stone-500">Background pop-ups are blocked in this browser's site settings</span>}
    </div>
  );
}

export default function OnlinePage() {
  const { can, me, writable } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  // Answering requests (online.respond) is on for every role by default; billing still needs pos.bill.
  const canRespond = can('online.respond') && writable;
  const canBookings = can('online.respond') || can('appointments.view');
  const canOrders = can('online.respond') || can('pos.bill');
  const canBill = can('pos.bill') && writable;
  const tab = params.get('tab') ?? (canBookings ? 'bookings' : 'orders');
  const bView = params.get('view') ?? 'pending';
  const oView = params.get('oview') ?? 'open';
  const branch = sessionStorage.getItem('aura.branch') ?? me?.branches[0]?.id;
  const branchName = me?.branches.find((b) => b.id === branch)?.name ?? me?.branches[0]?.name;
  const q = `branchId=${branch}`;

  const summary = useOnlineSummary(canBookings || canOrders);
  const bookings = useApi(tab === 'bookings' && canBookings ? `/online/bookings?view=${bView}&${q}` : null);
  const orders = useApi(tab === 'orders' && canOrders ? `/online/orders?view=${oView}&${q}` : null);
  const [busy, setBusy] = useState(false);
  const [reasonFor, setReasonFor] = useState(null); // { kind: 'booking'|'order', item, reason }

  const set = (k, v) => { const n = new URLSearchParams(params); n.set(k, v); setParams(n, { replace: true }); };
  const after = () => { bookings.reload(); orders.reload(); refreshOnlineSummary(); };
  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast(msg); after(); } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  const confirm = (b) => run(() => api.post(`/online/bookings/${b.id}/confirm`), `${b.customer.name}'s booking confirmed`);
  const setOrder = (o, status) => run(() => api.post(`/online/orders/${o.id}/status`, { status }), status === 'READY' ? `Order ${o.number} is ready for pickup` : `Order ${o.number} confirmed`);
  const submitReason = () => {
    const { kind, item, reason } = reasonFor;
    setReasonFor(null);
    if (kind === 'booking') run(() => api.post(`/online/bookings/${item.id}/decline`, { reason: reason.trim() || undefined }), 'Booking declined. The customer can see your reason.');
    else run(() => api.post(`/online/orders/${item.id}/status`, { status: 'CANCELLED', reason: reason.trim() || undefined }), `Order ${item.number} cancelled`);
  };

  const s = summary;
  const tabBtn = (key, label, count, Icon) => (
    <button role="tab" aria-selected={tab === key} onClick={() => set('tab', key)}
      className={cx('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold', tab === key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100')}>
      <Icon aria-hidden />{label}{count > 0 && <span className={cx('rounded-full px-1.5 text-xs', tab === key ? 'bg-white/20' : 'bg-rose-100 text-rose-800')}>{count}</span>}
    </button>
  );
  const chip = (key, cur, value, label) => (
    <button onClick={() => set(key, value)} className={cx('rounded-full border px-3 py-1 text-xs font-semibold', cur === value ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50')}>{label}</button>
  );

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="App requests" subtitle={`Bookings and product orders from the Salora Glam customer app at ${branchName ?? 'this branch'}.`} />
      <AlertSettings />
      {!writable && <ErrorNote>Your plan is not active, so your salon is hidden in the customer app and new requests can't be answered. Renew to continue.</ErrorNote>}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={LuCalendarCheck} label="Booking requests waiting" value={s?.bookings.pending ?? '–'} tone="warn" note="Confirm or decline them" />
        <Stat icon={LuClock} label="App bookings today" value={s?.bookings.today ?? '–'} note={s ? `${s.bookings.upcomingConfirmed} confirmed upcoming` : null} />
        <Stat icon={LuShoppingBag} label="Open product orders" value={s?.orders.open ?? '–'} tone="warn" note={s ? `${s.orders.new} new · ${s.orders.ready} ready for pickup` : null} />
        <Stat icon={LuSmartphone} label="Last 30 days" value={s ? s.bookings.last30.requests + s.orders.last30.placed : '–'}
          note={s ? `${plural(s.bookings.last30.requests, 'booking')} (${s.bookings.last30.completed} done, ${s.bookings.last30.declined} declined, ${s.bookings.last30.cancelledByCustomer} cancelled) · ${plural(s.orders.last30.placed, 'order')}, ${money0(s.orders.last30.collectedValue)} collected` : null} />
      </div>

      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        {canBookings && tabBtn('bookings', 'Booking requests', s?.bookings.pending ?? 0, LuCalendarCheck)}
        {canOrders && tabBtn('orders', 'Product orders', s?.orders.open ?? 0, LuShoppingBag)}
      </div>

      {tab === 'bookings' && canBookings && (
        <section>
          <div className="mb-3 flex flex-wrap gap-2">{chip('view', bView, 'pending', 'Waiting for you')}{chip('view', bView, 'upcoming', 'Upcoming')}{chip('view', bView, 'all', 'All (90 days)')}</div>
          {bookings.error && <ErrorNote onRetry={bookings.reload}>{bookings.error}</ErrorNote>}
          {bookings.loading ? <Skeleton rows={4} /> : !bookings.data?.length ? (
            <Empty title={bView === 'pending' ? 'No requests waiting' : 'No app bookings here yet'}>
              Customers book from the Salora Glam app. Requests hold the time slot until you confirm or decline them. Turn app bookings on or off per branch in Salon settings.
            </Empty>
          ) : (
            <ul className="space-y-3">
              {bookings.data.map((b) => <BookingCard key={b.id} b={b} canManage={canRespond} canBill={canBill} busy={busy} onConfirm={confirm} onDecline={(x) => setReasonFor({ kind: 'booking', item: x, reason: '' })} />)}
            </ul>
          )}
        </section>
      )}

      {tab === 'orders' && canOrders && (
        <section>
          <div className="mb-3 flex flex-wrap gap-2">{chip('oview', oView, 'open', 'Open')}{chip('oview', oView, 'all', 'All (90 days)')}</div>
          {orders.error && <ErrorNote onRetry={orders.reload}>{orders.error}</ErrorNote>}
          {orders.loading ? <Skeleton rows={4} /> : !orders.data?.length ? (
            <Empty title={oView === 'open' ? 'No open orders' : 'No app orders yet'}>
              Customers order products for pickup and pay at the counter. Units in open orders are held so they aren't sold twice.
            </Empty>
          ) : (
            <ul className="space-y-3">
              {orders.data.map((o) => <OrderCard key={o.id} o={o} canRespond={canRespond} canBill={canBill} busy={busy} onStatus={setOrder} onCancel={(x) => setReasonFor({ kind: 'order', item: x, reason: '' })} />)}
            </ul>
          )}
        </section>
      )}

      {reasonFor && (
        <Modal open onClose={() => setReasonFor(null)}
          title={reasonFor.kind === 'booking' ? `Decline ${reasonFor.item.customer.name}'s booking?` : `Cancel order ${reasonFor.item.number}?`}
          description={reasonFor.kind === 'booking' ? `${whenLabel(reasonFor.item.startsAt)} · ${reasonFor.item.services.map((x) => x.name).join(' + ')}. The time slot is freed and the customer sees your reason in the app.` : 'The held units go back on sale and the customer sees your reason in the app.'}
          footer={<><Button onClick={() => setReasonFor(null)}>Keep it</Button><Button variant="primary" onClick={submitReason}>{reasonFor.kind === 'booking' ? 'Decline booking' : 'Cancel order'}</Button></>}>
          <Field label="Reason for the customer (optional)" value={reasonFor.reason} maxLength={200} onChange={(e) => setReasonFor((r) => ({ ...r, reason: e.target.value }))}
            placeholder={reasonFor.kind === 'booking' ? 'e.g. Fully booked at that time, please pick 5 pm' : 'e.g. Out of stock'} />
        </Modal>
      )}
      <p className="mt-6 text-xs text-stone-400">Updated every minute. {date(new Date())}</p>
    </div>
  );
}
