import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { ADJUSTMENT_TYPES } from '../utils/inventory.constants.js';

/** Damage, backbar use or a count correction. A reason is always recorded. */
export function AdjustStockModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ type: 'DAMAGE', qty: 1, note: '' });
  const [busy, setBusy] = useState(false);
  const delta = f.type === 'ADJUSTMENT' ? Number(f.qty) : -Math.abs(Number(f.qty));
  const save = async () => {
    setBusy(true);
    try { await api.post('/inventory/adjustments', { itemId: item.id, delta, type: f.type, note: f.note }); toast(`${item.name}: stock updated`); onSaved(); }
    catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Adjust ${item.name}`} description={`${item.stock} in stock now.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={!delta || f.note.trim().length < 3} onClick={save}>Save adjustment</Button></>}>
      <div className="space-y-3">
        <Field as="select" label="What happened" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          {ADJUSTMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Field>
        <Field label={f.type === 'ADJUSTMENT' ? 'Change (use − to reduce)' : 'Units'} type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })}
          hint={delta ? `Stock will be ${item.stock + delta} after saving.` : undefined} />
        <Field label="Reason" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Bottle cracked in storage" />
      </div>
    </Modal>
  );
}
