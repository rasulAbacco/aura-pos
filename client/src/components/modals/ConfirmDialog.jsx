import { useState } from 'react';
import { Button } from '../ui';
import { Field } from '../forms';
import { Modal } from './Modal.jsx';

/**
 * Confirmation for destructive or important actions (replaces window.confirm / prompt).
 * Pass `reasonLabel` to require a typed reason; onConfirm receives it.
 */
export function ConfirmDialog({ title, description, confirmLabel, cancelLabel = 'Cancel', danger, reasonLabel, reasonPlaceholder, minReason = 3, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const needsReason = !!reasonLabel;
  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(reason.trim()); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={title} description={description}
      footer={<>
        <Button onClick={onClose}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} disabled={needsReason && reason.trim().length < minReason} onClick={confirm}>{confirmLabel}</Button>
      </>}>
      {needsReason
        ? <Field label={reasonLabel} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={reasonPlaceholder} autoFocus />
        : <p className="text-sm text-stone-600">This can’t be undone from here.</p>}
    </Modal>
  );
}
