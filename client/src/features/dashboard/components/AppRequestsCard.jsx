import { Link } from 'react-router-dom';
import { LuSmartphone, LuChevronRight } from 'react-icons/lu';
import { useOnlineSummary } from '../../../lib/onlineSummary.js';
import { money0 } from '../../../utils/format.js';

/** Customer-app activity for this branch: requests waiting, today's app bookings, open orders, last 30 days. */
export function AppRequestsCard({ enabled }) {
  const s = useOnlineSummary(enabled);
  if (!enabled || !s) return null;
  const waiting = s.bookings.pending + s.orders.new;
  const items = [
    ['Booking requests waiting', s.bookings.pending, s.bookings.pending > 0],
    ['App bookings today', s.bookings.today],
    ['Confirmed upcoming', s.bookings.upcomingConfirmed],
    ['Open product orders', s.orders.open, s.orders.new > 0],
  ];
  return (
    <Link to="/app/online" className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold text-stone-900"><LuSmartphone aria-hidden className="text-rose-700" />Customer app</p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-rose-700">{waiting ? `${waiting} need${waiting === 1 ? 's' : ''} an answer` : 'Open'}<LuChevronRight aria-hidden /></span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(([label, value, warn]) => (
          <div key={label}><dt className="text-xs text-stone-500">{label}</dt><dd className={`num text-xl font-extrabold ${warn ? 'text-rose-800' : 'text-stone-900'}`}>{value}</dd></div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-stone-500">
        Last 30 days: {s.bookings.last30.requests} booking{s.bookings.last30.requests === 1 ? '' : 's'} ({s.bookings.last30.completed} completed, {s.bookings.last30.declined} declined, {s.bookings.last30.cancelledByCustomer} cancelled by customers, {s.bookings.last30.noShow} no-shows) · {s.orders.last30.placed} order{s.orders.last30.placed === 1 ? '' : 's'}, {s.orders.last30.collected} collected ({money0(s.orders.last30.collectedValue)})
      </p>
    </Link>
  );
}
