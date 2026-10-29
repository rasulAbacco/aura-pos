import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { useApi } from '../../../hooks/useApi.js';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { Button, Skeleton } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { DataTable } from '../../../components/tables';

export function SuppliersPanel({ canManage }) {
  const toast = useToast();
  const list = useApi('/inventory/suppliers');
  const [f, setF] = useState({ name: '', phone: '', email: '' });
  const add = async () => {
    try {
      await api.post('/inventory/suppliers', { name: f.name, ...(f.phone ? { phone: f.phone } : {}), ...(f.email ? { email: f.email } : {}) });
      toast(`Added ${f.name}`); setF({ name: '', phone: '', email: '' }); list.reload();
    } catch (e) { toast(errorMessage(e), 'error'); }
  };
  return (
    <div className="space-y-4">
      {list.loading ? <Skeleton rows={3} /> : (
        <DataTable rows={list.data ?? []} minWidth={480} empty="No suppliers yet."
          columns={[{ key: 'name', header: 'Supplier', render: (s) => <b>{s.name}</b> }, { key: 'phone', header: 'Phone' }, { key: 'email', header: 'Email' }]} />
      )}
      {canManage && (
        <div className="grid items-end gap-2 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_10rem_12rem_auto]">
          <Field label="Supplier name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="L'Oréal distributor" />
          <Field label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Field label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Button variant="primary" disabled={f.name.trim().length < 2} onClick={add}>Add supplier</Button>
        </div>
      )}
    </div>
  );
}
