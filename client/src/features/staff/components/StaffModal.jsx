import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';

const blank = { name: '', designation: 'Stylist', phone: '', whatsapp: '', baseSalary: 25000, salaryFrequency: 'MONTHLY', serviceCommission: 30, productCommission: 10, aadhaar: '', pan: '', bankName: '', bankAccount: '', ifsc: '', address: '' };

/** Add / edit staff. Aadhaar, PAN and account number are masked by the server before storage. */
export function StaffModal({ person, onClose, onSaved }) {
  const { can } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(person
    ? { ...blank, ...person, baseSalary: person.baseSalary ?? '', serviceCommission: Number(person.serviceCommission), productCommission: Number(person.productCommission), aadhaar: '', pan: '', bankAccount: '' }
    : blank);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    const body = {
      name: f.name, designation: f.designation, phone: f.phone, whatsapp: f.whatsapp || null, salaryFrequency: f.salaryFrequency,
      baseSalary: Number(f.baseSalary || 0), serviceCommission: Number(f.serviceCommission), productCommission: Number(f.productCommission),
      ...(can('staff.kyc') ? {
        address: f.address || null, bankName: f.bankName || null, ifsc: f.ifsc || null,
        ...(f.aadhaar ? { aadhaar: f.aadhaar } : {}), ...(f.pan ? { pan: f.pan } : {}), ...(f.bankAccount ? { bankAccount: f.bankAccount } : {}),
      } : {}),
    };
    try {
      if (person) await api.patch(`/staff/${person.id}`, body); else await api.post('/staff', body);
      toast(person ? 'Saved — new rates apply to future sales' : `Added ${f.name}`); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open wide onClose={onClose} title={person ? `Edit ${person.name}` : 'Add staff member'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={f.name.length < 2 || f.phone.length < 8} onClick={save}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" value={f.name} onChange={set('name')} />
        <Field label="Role" value={f.designation} onChange={set('designation')} placeholder="Senior colourist" />
        <Field label="Phone" value={f.phone} onChange={set('phone')} />
        <Field label="WhatsApp" value={f.whatsapp ?? ''} onChange={set('whatsapp')} hint={<button type="button" className="text-rose-700" onClick={() => setF({ ...f, whatsapp: f.phone })}>Same as phone</button>} />
        <Field label="Base salary (₹)" type="number" value={f.baseSalary} onChange={set('baseSalary')} />
        <Field as="select" label="Paid" value={f.salaryFrequency} onChange={set('salaryFrequency')}><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="DAILY">Daily</option></Field>
        <Field label="Service commission (%)" type="number" value={f.serviceCommission} onChange={set('serviceCommission')} />
        <Field label="Retail commission (%)" type="number" value={f.productCommission} onChange={set('productCommission')} />
      </div>
      {can('staff.kyc') && (
        <fieldset className="mt-4 rounded-lg border border-stone-200 p-3">
          <legend className="px-1 text-xs font-semibold text-stone-600">Identity & bank (stored masked)</legend>
          <p className="mb-3 text-xs text-stone-500">Only the last 4 digits of Aadhaar and account number are kept. Leave blank to keep what’s on file{person?.aadhaarLast4 ? ` (Aadhaar ••••${person.aadhaarLast4})` : ''}.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Aadhaar" value={f.aadhaar} onChange={set('aadhaar')} inputMode="numeric" autoComplete="off" />
            <Field label="PAN" value={f.pan} onChange={set('pan')} autoComplete="off" />
            <Field label="IFSC" value={f.ifsc ?? ''} onChange={set('ifsc')} />
            <Field label="Bank" value={f.bankName ?? ''} onChange={set('bankName')} />
            <Field label="Account number" value={f.bankAccount} onChange={set('bankAccount')} inputMode="numeric" autoComplete="off" />
            <Field label="Address" value={f.address ?? ''} onChange={set('address')} />
          </div>
        </fieldset>
      )}
    </Modal>
  );
}
