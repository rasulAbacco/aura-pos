import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { money } from '../../../utils/format.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { useApi } from '../../../hooks/useApi.js';
import { useToast } from '../../../contexts/ToastContext.jsx';

export function CouponsSection() {
  const toast = useToast();
  const list = useApi('/pos/coupons?all=true');
  const [f, setF] = useState({ code: '', kind: 'PERCENT', value: 10, minSubtotal: 0, firstVisitOnly: false });
  const add = async () => {
    try {
      await api.post('/pos/coupons', { ...f, value: Number(f.value), minSubtotal: Number(f.minSubtotal) });
      toast(`Coupon ${f.code.toUpperCase()} created`); setF({ ...f, code: '' }); list.reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  };
  return (
    <>
      <ul className="mb-4 divide-y divide-stone-100 text-sm">
        {(list.data ?? []).map((c) => (
          <li key={c.id} className="flex justify-between py-2">
            <span><b className="num">{c.code}</b> — {c.kind === 'PERCENT' ? `${Number(c.value)}% off` : `${money(c.value)} off`}{Number(c.minSubtotal) > 0 && ` over ${money(c.minSubtotal)}`}{c.firstVisitOnly && ', first visit only'}</span>
            <span className="text-stone-500">used {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</span>
          </li>
        ))}
      </ul>
      <div className="grid items-end gap-2 sm:grid-cols-[1fr_8rem_6rem_7rem_auto]">
        <Field label="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="DIWALI20" />
        <Field as="select" label="Type" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="PERCENT">Percent</option><option value="FLAT">Flat ₹</option></Field>
        <Field label="Value" type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
        <Field label="Min bill ₹" type="number" value={f.minSubtotal} onChange={(e) => setF({ ...f, minSubtotal: e.target.value })} />
        <Button variant="primary" disabled={f.code.length < 3} onClick={add}>Add coupon</Button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.firstVisitOnly} onChange={(e) => setF({ ...f, firstVisitOnly: e.target.checked })} /> First visit only</label>
    </>
  );
}
