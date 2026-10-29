import { time } from '../../../utils/format.js';
import { Badge, Button } from '../../../components/ui';
import { cx } from '../../../utils/cx.js';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_TONE, NEXT_STEPS, STEP_LABEL } from '../utils/appointments.constants.js';

/** One stylist's day: their bookings with the next action for each. */
export function StaffQueueColumn({ staff, items, canManage, canBill, onMove, onBill }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white" aria-label={staff.name}>
      <h2 className="border-b border-stone-100 px-4 py-3 text-sm font-semibold">{staff.name}<span className="ml-2 font-normal text-stone-500">{staff.designation ?? ''}</span></h2>
      {!items.length ? <p className="px-4 py-6 text-sm text-stone-500">Free all day.</p> : (
        <ul className="divide-y divide-stone-100">
          {items.map((a) => (
            <li key={a.id} className={cx('px-4 py-3 text-sm', ['CANCELLED', 'NO_SHOW'].includes(a.status) && 'opacity-60')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{a.customer.name}</p>
                  <p className="text-stone-600">{a.serviceName}</p>
                  <p className="num text-xs text-stone-500">{time(a.startsAt)}–{time(a.endsAt)}{a.resource ? ` · ${a.resource.name}` : ''}{a.isWalkIn ? ' · walk-in' : ''}</p>
                </div>
                <Badge tone={APPOINTMENT_STATUS_TONE[a.status]}>{APPOINTMENT_STATUS_LABEL[a.status]}</Badge>
              </div>
              {canManage && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(NEXT_STEPS[a.status] ?? []).map((n) => <Button key={n} size="sm" onClick={() => onMove(a, n)}>{STEP_LABEL[n]}</Button>)}
                  {['WAITING', 'CHECKED_IN', 'IN_SERVICE', 'CONFIRMED', 'BOOKED'].includes(a.status) && canBill && <Button size="sm" variant="dark" onClick={() => onBill(a)}>Bill</Button>}
                  {['BOOKED', 'CONFIRMED', 'WAITING', 'CHECKED_IN'].includes(a.status) && <Button size="sm" variant="ghost" onClick={() => onMove(a, 'CANCELLED')}>Cancel</Button>}
                  {['BOOKED', 'CONFIRMED'].includes(a.status) && new Date(a.startsAt) < new Date() && <Button size="sm" variant="ghost" onClick={() => onMove(a, 'NO_SHOW')}>No-show</Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
