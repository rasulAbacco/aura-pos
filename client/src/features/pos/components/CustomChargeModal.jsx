import { useState } from 'react';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';

/** Ad-hoc service with its own price (needs the pos.custom_item permission on the server too). */
export function CustomChargeModal({ staff, onClose, onAdd }) {
  const [f, setF] = useState({ name: '', price: '', staffId: '' });
  const valid = f.name.trim().length >= 2 && f.price !== '' && Number(f.price) >= 0;
  const add = () => onAdd({ key: crypto.randomUUID(), type: 'CUSTOM', name: f.name.trim(), quantity: 1, unitPrice: f.price, listPrice: f.price, staffId: f.staffId });
  return (
    <Modal open onClose={onClose} title="Custom charge" description="An ad-hoc service with its own price, e.g. extra toner bowl or fringe trim."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={add}>Add to bill</Button></>}>
      <div className="space-y-3">
        <Field label="Description" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Fringe trim" autoFocus />
        <Field label="Price (₹, before GST)" type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <Field as="select" label="Stylist" value={f.staffId} onChange={(e) => setF({ ...f, staffId: e.target.value })}>
          <option value="">No stylist</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Field>
      </div>
    </Modal>
  );
}
