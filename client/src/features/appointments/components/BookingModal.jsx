import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { time, todayISO } from '../../../utils/format.js';
import { Button, Skeleton } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { cx } from '../../../utils/cx.js';

/** Book a future slot (only free times are offered) or add a walk-in to the waiting queue. */
export function BookingModal({ staff, services, clients, onClose, onSaved, defaultDate }) {
  const toast = useToast();
  const [f, setF] = useState({ customerId: '', staffId: staff[0]?.id ?? '', serviceId: services[0]?.id ?? '', date: defaultDate, slot: '', walkIn: false, notes: '' });
  const [slots, setSlots] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (f.walkIn || !f.staffId || !f.serviceId) return;
    setSlots(null);
    api.get(`/appointments/availability?date=${f.date}&staffId=${f.staffId}&serviceId=${f.serviceId}`).then((r) => setSlots(r.data.data.slots)).catch(() => setSlots([]));
  }, [f.date, f.staffId, f.serviceId, f.walkIn]);

  const save = async () => {
    setBusy(true);
    try {
      await api.post('/appointments', { customerId: f.customerId, staffId: f.staffId, serviceId: f.serviceId, walkIn: f.walkIn, startsAt: f.walkIn ? undefined : f.slot, notes: f.notes || undefined });
      toast(f.walkIn ? 'Walk-in added to the queue' : 'Appointment booked'); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open wide onClose={onClose} title="Book appointment or walk-in" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!f.customerId || (!f.walkIn && !f.slot)} onClick={save}>{f.walkIn ? 'Add to queue' : 'Book'}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field as="select" label="Client" value={f.customerId} onChange={(e) => setF({ ...f, customerId: e.target.value })}><option value="">Choose a client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</Field>
        <Field as="select" label="Service" value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value, slot: '' })}>{services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMin} min)</option>)}</Field>
        <Field as="select" label="Stylist / therapist" value={f.staffId} onChange={(e) => setF({ ...f, staffId: e.target.value, slot: '' })}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.designation}</option>)}</Field>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.walkIn} onChange={(e) => setF({ ...f, walkIn: e.target.checked })} /> Walk-in now (joins the waiting queue)</label>
      </div>
      {!f.walkIn && (
        <div className="mt-4">
          <Field label="Date" type="date" min={todayISO()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, slot: '' })} className="max-w-48" />
          <p className="mb-1.5 mt-3 text-xs font-semibold text-stone-600">Free start times</p>
          {slots === null ? <Skeleton rows={1} /> : !slots.length ? <p className="text-sm text-stone-500">No free time for this stylist on this day. Try another stylist or date.</p> : (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Start time">
              {slots.map((s) => <button key={s} role="radio" aria-checked={f.slot === s} onClick={() => setF({ ...f, slot: s })} className={cx('num rounded-md border px-2.5 py-1 text-xs font-semibold', f.slot === s ? 'border-rose-700 bg-rose-700 text-white' : 'border-stone-300 bg-white')}>{time(s)}</button>)}
            </div>
          )}
        </div>
      )}
      <Field label="Notes" className="mt-3" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
    </Modal>
  );
}
