import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { useToast } from '../../../contexts/ToastContext.jsx';

/** Salon name, GSTIN, tax-inclusive pricing and rounding. Used on all new invoices. */
export function BusinessProfileForm({ tenant, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(tenant);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/settings/profile', { displayName: f.displayName, legalName: f.legalName, tagline: f.tagline || null, gstin: f.gstin || null, stateCode: f.stateCode || null, pricesIncludeTax: f.pricesIncludeTax, roundOffInvoice: f.roundOffInvoice });
      toast('Salon profile saved'); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Salon name (on receipts)" value={f.displayName} onChange={set('displayName')} />
      <Field label="Legal business name" value={f.legalName} onChange={set('legalName')} />
      <Field label="Tagline" value={f.tagline ?? ''} onChange={set('tagline')} className="sm:col-span-2" />
      <Field label="GSTIN" value={f.gstin ?? ''} onChange={set('gstin')} placeholder="29ABCDE1234F1Z5" hint="Leave empty if you are not GST-registered." />
      <Field label="GST state code" value={f.stateCode ?? ''} onChange={set('stateCode')} placeholder="29" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.pricesIncludeTax} onChange={set('pricesIncludeTax')} /> Price list already includes GST</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.roundOffInvoice} onChange={set('roundOffInvoice')} /> Round bills to the nearest rupee</label>
      <div className="sm:col-span-2"><Button variant="primary" loading={busy} onClick={save}>Save profile</Button></div>
    </div>
  );
}
