import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';

export function NewPlanModal({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', price: '', discountPercent: 10, bonusWalletCredit: 0, validityMonths: 12, perks: '', appliesToServices: true, appliesToProducts: false });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/memberships/plans', { ...f, price: Number(f.price), discountPercent: Number(f.discountPercent), bonusWalletCredit: Number(f.bonusWalletCredit), validityMonths: Number(f.validityMonths) });
      toast(`Created ${f.name}`); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="New membership plan" description="Sold to clients at the counter. Members get the discount automatically."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={f.name.length < 2 || !(Number(f.price) > 0)} onClick={save}>Create plan</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field className="col-span-2" label="Plan name" value={f.name} onChange={set('name')} placeholder="Diamond Royale" />
        <Field label="Price (₹, before GST)" type="number" value={f.price} onChange={set('price')} />
        <Field label="Valid for (months)" type="number" min="1" value={f.validityMonths} onChange={set('validityMonths')} />
        <Field label="Discount (%)" type="number" min="0" max="100" value={f.discountPercent} onChange={set('discountPercent')} />
        <Field label="Joining wallet bonus (₹)" type="number" min="0" value={f.bonusWalletCredit} onChange={set('bonusWalletCredit')} />
        <Field className="col-span-2" label="Perks shown to staff" value={f.perks} onChange={set('perks')} placeholder="Free head massage on birthday" />
      </div>
      <fieldset className="mt-3 space-y-1 text-sm"><legend className="mb-1 text-xs font-semibold text-stone-600">Discount applies to</legend>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.appliesToServices} onChange={set('appliesToServices')} /> Services</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.appliesToProducts} onChange={set('appliesToProducts')} /> Retail products</label>
      </fieldset>
    </Modal>
  );
}
