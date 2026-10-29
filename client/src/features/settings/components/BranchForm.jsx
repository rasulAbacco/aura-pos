import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { useToast } from '../../../contexts/ToastContext.jsx';

/** Address, phone and UPI ID printed on this branch's receipts. */
export function BranchForm({ branch, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(branch);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    try {
      await api.patch(`/settings/branches/${branch.id}`, { name: f.name, address: f.address || null, phone: f.phone || null, email: f.email || null, upiId: f.upiId || null, receiptFooter: f.receiptFooter || null, stateCode: f.stateCode || null });
      toast('Branch saved'); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); }
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Branch name" value={f.name} onChange={set('name')} />
      <Field label="Invoice code" value={f.code} disabled hint="Fixed once created; appears in invoice numbers." />
      <Field label="Address" as="textarea" value={f.address ?? ''} onChange={set('address')} className="sm:col-span-2" />
      <Field label="Phone" value={f.phone ?? ''} onChange={set('phone')} />
      <Field label="UPI ID (printed on receipts)" value={f.upiId ?? ''} onChange={set('upiId')} placeholder="salon@okhdfcbank" />
      <Field label="Receipt footer" value={f.receiptFooter ?? ''} onChange={set('receiptFooter')} className="sm:col-span-2" />
      <div><Button variant="primary" onClick={save}>Save branch</Button></div>
    </div>
  );
}
