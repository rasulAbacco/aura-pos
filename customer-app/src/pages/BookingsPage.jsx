/** My bookings across all salons: upcoming and past, with status from the salon. Refreshes every minute. */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LuCalendarDays, LuPhone, LuMapPin, LuRotateCcw } from 'react-icons/lu';
import { LuNavigation } from 'react-icons/lu';
import { api, errorMessage } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { directionsUrl } from '../lib/location.jsx';
import { BOOKING_STATUS } from '../lib/constants.js';
import { minutes, when } from '../lib/format.js';
import { useToast } from '../components/Toast.jsx';
import { Badge, Button, Empty, ErrorBox, Field, Header, Page, Sheet, Spinner, cx } from '../components/ui.jsx';

const isUpcoming = (b) => ['BOOKED', 'CONFIRMED', 'WAITING', 'CHECKED_IN', 'IN_SERVICE'].includes(b.status) && new Date(b.endsAt) > Date.now() - 3 * 3600000;

function BookingCard({ b, onCancel }) {
  const st = BOOKING_STATUS[b.status] ?? { label: b.status, short: b.status, tone: 'stone' };
  const mins = Math.round((new Date(b.endsAt) - new Date(b.startsAt)) / 60000);
  return (
    <li className="animate-rise rounded-2xl bg-white p-4 ring-1 ring-blush">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-tight">{when(b.startsAt)}</p>
          <p className="text-xs text-stone-500">{minutes(mins)}{b.staffName ? ` · with ${b.staffName}` : ''}</p>
        </div>
        <Badge tone={st.tone}>{st.short}</Badge>
      </div>
      <p className="mt-2 text-sm font-medium">{b.services.map((x) => x.name).join(' + ')}</p>
      <Link to={`/s/${b.salon.slug}`} className="mt-1 block text-sm text-stone-600 hover:text-mauve"><b>{b.salon.name}</b> · {b.branch.name}</Link>
      {b.branch.address && <p className="mt-0.5 flex items-start gap-1 text-xs text-stone-500"><LuMapPin size={12} className="mt-0.5 shrink-0" aria-hidden />{b.branch.address}</p>}
      {b.status === 'BOOKED' && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">{st.label}. Your time is held for you.</p>}
      {b.cancelReason && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">{b.cancelReason}</p>}
      {b.notes && <p className="mt-2 text-xs text-stone-500">Your note: “{b.notes}”</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {b.branch.phone && <a href={`tel:${b.branch.phone}`} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-mauve ring-1 ring-blush"><LuPhone size={14} aria-hidden />Call salon</a>}
        <a href={directionsUrl({ lat: b.branch.latitude, lng: b.branch.longitude, query: `${b.salon.name} ${b.branch.address ?? ''}` })} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-mauve ring-1 ring-blush"><LuNavigation size={14} aria-hidden />Directions</a>
        {b.canCancel && <Button variant="danger" size="sm" onClick={() => onCancel(b)}>Cancel booking</Button>}
        {!isUpcoming(b) && <Link to={`/s/${b.salon.slug}`} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-mauve ring-1 ring-blush"><LuRotateCcw size={14} aria-hidden />Book again</Link>}
      </div>
    </li>
  );
}

export default function BookingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'upcoming';
  const toast = useToast();
  const list = useApi('/bookings', { every: 60000 });
  const [cancel, setCancel] = useState(null);
  const [busy, setBusy] = useState(false);
  const all = list.data ?? [];
  const upcoming = all.filter(isUpcoming).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const past = all.filter((b) => !isUpcoming(b));
  const shown = tab === 'upcoming' ? upcoming : past;

  const doCancel = async () => {
    setBusy(true);
    try { await api.post(`/bookings/${cancel.b.id}/cancel`, { reason: cancel.reason.trim() || undefined }); toast('Booking cancelled'); setCancel(null); list.reload(); }
    catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen">
      <Header title="My bookings" back={false} wide={false} />
      <Page narrow className="md:mt-4">
        <div role="tablist" className="mb-4 grid grid-cols-2 rounded-2xl bg-white p-1 ring-1 ring-blush">
          {[['upcoming', `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}`], ['past', 'Past']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k }, { replace: true })} className={cx('rounded-xl py-2 text-sm font-semibold', tab === k ? 'bg-mauve text-white' : 'text-stone-600')}>{l}</button>
          ))}
        </div>
        {list.error && <ErrorBox onRetry={list.reload}>{list.error}</ErrorBox>}
        {list.loading ? <Spinner /> : !shown.length ? (
          <Empty icon={LuCalendarDays} title={tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings yet'} action={<Link to="/" className="font-semibold text-mauve">Find a salon</Link>}>
            {tab === 'upcoming' ? 'Book a service and it will show here, with the salon’s confirmation.' : 'Your visits will show here.'}
          </Empty>
        ) : <ul className="space-y-3">{shown.map((b) => <BookingCard key={b.id} b={b} onCancel={(x) => setCancel({ b: x, reason: '' })} />)}</ul>}
      </Page>
      <Sheet open={!!cancel} onClose={() => setCancel(null)} title="Cancel this booking?"
        footer={<><Button variant="secondary" className="flex-1" onClick={() => setCancel(null)}>Keep it</Button><Button className="flex-1" disabled={busy} onClick={doCancel}>{busy ? 'Cancelling…' : 'Cancel booking'}</Button></>}>
        {cancel && <>
          <p className="text-sm text-stone-600">{when(cancel.b.startsAt)} at {cancel.b.salon.name}. The salon is told straight away and the time is freed.</p>
          <Field className="mt-4" label="Reason (optional)" value={cancel.reason} maxLength={200} onChange={(e) => setCancel({ ...cancel, reason: e.target.value })} />
        </>}
      </Sheet>
    </div>
  );
}
