import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';

/** Goods received: adds stock and writes a RECEIPT movement with cost and batch. */
export function RestockModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ quantity: 10, unitCost: item.cost ?? '', batchNo: '', note: '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/inventory/receipts', { itemId: item.id, quantity: Number(f.quantity), unitCost: f.unitCost === '' ? undefined : Number(f.unitCost), batchNo: f.batchNo || undefined, note: f.note || undefined });
      toast(`Added ${f.quantity} × ${item.name}`); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Restock ${item.name}`} description={`${item.stock} in stock now.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!(Number(f.quantity) > 0)} onClick={save}>Add stock</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Units received" type="number" min="1" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        <Field label="Unit cost (₹)" type="number" value={f.unitCost} onChange={(e) => setF({ ...f, unitCost: e.target.value })} />
        <Field label="Batch no." value={f.batchNo} onChange={(e) => setF({ ...f, batchNo: e.target.value })} />
        <Field label="Supplier / note" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </div>
    </Modal>
  );
}
