import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';

export function VoidInvoiceModal({ invoice, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const submit = async () => {
    try { await api.post(`/invoices/${invoice.id}/void`, { reason }); toast(`${invoice.number} voided`); onDone(); }
    catch (e) { toast(errorMessage(e), 'error'); }
  };
  return (
    <Modal open onClose={onClose} title={`Void ${invoice.number}?`} description="Only same-day bills can be voided. Stock, wallet and commissions are reversed."
      footer={<><Button onClick={onClose}>Keep invoice</Button><Button variant="danger" disabled={reason.trim().length < 5} onClick={submit}>Void invoice</Button></>}>
      <Field label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Billed to the wrong client" autoFocus />
    </Modal>
  );
}
