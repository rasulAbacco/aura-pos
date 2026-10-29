import { useState } from 'react';
import { errorMessage } from '../../../lib/api.js';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { platformApi } from '../utils/platformApi.js';

const blank = { code: '', name: '', description: '', interval: 'MONTHLY', price: 999, trialDays: 0, graceDays: 3, maxStaff: 5, maxBranches: 1, features: '', isPublic: true, isActive: true, sortOrder: 10 };

/** Create a plan, or edit one (code is fixed once created; prices on paid invoices never change). */
export function PlanModal({ plan, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(plan ? { ...plan, price: Number(plan.price), features: plan.features.join(', '), description: plan.description ?? '' } : blank);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async () => {
    setBusy(true);
    const body = {
      name: f.name, description: f.description || undefined, interval: f.interval, price: Number(f.price), trialDays: Number(f.trialDays), graceDays: Number(f.graceDays),
      maxStaff: Number(f.maxStaff), maxBranches: Number(f.maxBranches), features: f.features.split(',').map((s) => s.trim()).filter(Boolean),
      isPublic: f.isPublic, isActive: f.isActive, sortOrder: Number(f.sortOrder),
    };
    try {
      if (plan) await platformApi.patch(`/plans/${plan.id}`, body); else await platformApi.post('/plans', { ...body, code: f.code });
      toast(`Saved ${f.name}`); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={plan ? `Edit ${plan.name}` : 'New plan'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save plan</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code (url-safe)" value={f.code} onChange={set('code')} disabled={!!plan} placeholder="growth-monthly" />
        <Field label="Name" value={f.name} onChange={set('name')} />
        <Field as="select" label="Billing interval" value={f.interval} onChange={set('interval')}>
          <option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="ANNUAL">Annual</option>
        </Field>
        <Field label="Price (₹, GST inclusive)" type="number" value={f.price} onChange={set('price')} />
        <Field label="Trial days" type="number" value={f.trialDays} onChange={set('trialDays')} />
        <Field label="Grace days after expiry" type="number" value={f.graceDays} onChange={set('graceDays')} />
        <Field label="Max staff" type="number" value={f.maxStaff} onChange={set('maxStaff')} />
        <Field label="Max branches" type="number" value={f.maxBranches} onChange={set('maxBranches')} />
        <Field className="sm:col-span-2" label="Features (comma separated)" value={f.features} onChange={set('features')} hint="e.g. multibranch, reports.export" />
        <Field className="sm:col-span-2" as="textarea" label="Description" value={f.description} onChange={set('description')} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isPublic} onChange={set('isPublic')} /> Shown on the pricing page</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isActive} onChange={set('isActive')} /> Can be purchased</label>
      </div>
    </Modal>
  );
}
