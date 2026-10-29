import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';

export function VoidExpenseModal({ expense, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const submit = async () => {
    try { await api.post(`/expenses/${expense.id}/void`, { reason }); toast('Expense voided'); onDone(); }
    catch (e) { toast(errorMessage(e), 'error'); }
  };
  return (
    <Modal open onClose={onClose} title={`Void “${expense.title}”?`} description="The record stays in the audit trail but no longer counts in reports."
      footer={<><Button onClick={onClose}>Keep expense</Button><Button variant="danger" disabled={reason.trim().length < 3} onClick={submit}>Void expense</Button></>}>
      <Field label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Entered twice" autoFocus />
    </Modal>
  );
}
