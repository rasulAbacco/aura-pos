import { Link } from 'react-router-dom';
import { time } from '../../../utils/format.js';
import { Badge } from '../../../components/ui';
import { APPOINTMENT_STATUS_LABEL } from '../../appointments';

export function TodayQueue({ byStatus, upcoming, canOpen }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4" aria-label="Today's queue">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Today’s queue</h2>{canOpen && <Link to="/app/appointments" className="text-xs font-semibold text-rose-700">Open queue</Link>}</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(byStatus).map(([k, v]) => <Badge key={k} tone={k === 'IN_SERVICE' ? 'green' : k === 'WAITING' ? 'amber' : 'stone'}>{APPOINTMENT_STATUS_LABEL[k]} {v}</Badge>)}
        {!Object.keys(byStatus).length && <span className="text-sm text-stone-500">No bookings today.</span>}
      </div>
      <ul className="mt-4 divide-y divide-stone-100 text-sm">
        {upcoming.map((a) => (
          <li key={a.id} className="flex justify-between gap-2 py-2">
            <span><b>{a.customer.name}</b> · {a.serviceName}<span className="block text-xs text-stone-500">with {a.staff.name}</span></span>
            <span className="num shrink-0 text-stone-600">{time(a.startsAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
