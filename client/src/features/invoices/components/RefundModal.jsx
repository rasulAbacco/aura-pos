import { useEffect, useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { money } from '../../../utils/format.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useToast } from '../../../contexts/ToastContext.jsx';

/** Partial or full refund → GST credit note. The amount always comes from the server's own calculation. */
export function RefundModal({ invoice, onClose, onDone }) {
  const toast = useToast();
  const refundable = invoice.lines.filter((l) => l.type !== 'MEMBERSHIP' && l.quantity > l.refundedQuantity);
  const [qty, setQty] = useState(Object.fromEntries(refundable.map((l) => [l.id, 0])));
  const [method, setMethod] = useState('CASH');
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const lines = Object.entries(qty).filter(([, q]) => q > 0).map(([lineId, quantity]) => ({ lineId, quantity }));

  useEffect(() => {
    if (!lines.length) { setAmount(0); return; }
    api.post(`/invoices/${invoice.id}/refund`, { lines, preview: true }).then((r) => setAmount(Number(r.data.data.amount))).catch(() => setAmount(0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty, invoice.id]);

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/invoices/${invoice.id}/refund`, { lines, payments: [{ method, amount: amount.toFixed(2) }], restock, reason });
      toast(`Credit note ${r.data.data.number} issued for ${money(r.data.data.amount)}`); onDone();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={`Refund from ${invoice.number}`} description="Issues a GST credit note. The original invoice is never edited."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} disabled={amount <= 0 || reason.trim().length < 5} onClick={save}>Refund {money(amount)}</Button></>}>
      <table className="mb-4 w-full text-sm"><tbody className="divide-y divide-stone-100">
        {refundable.map((l) => {
          const max = l.quantity - l.refundedQuantity;
          return (
            <tr key={l.id}>
              <td className="py-2">{l.description}<span className="block text-xs text-stone-500">{max} of {l.quantity} refundable · {money(l.totalAmount)} line total</span></td>
              <td className="w-24"><input type="number" aria-label={`Quantity to refund for ${l.description}`} min="0" max={max} value={qty[l.id]} onChange={(e) => setQty({ ...qty, [l.id]: Math.max(0, Math.min(max, Number(e.target.value))) })} className="num w-full rounded border border-stone-300 px-2 py-1 text-right" /></td>
            </tr>
          );
        })}
      </tbody></table>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field as="select" label="Refund via" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option>{invoice.customerId && <option value="WALLET">Client wallet</option>}
        </Field>
        <Field label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Returned unopened" />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put returned products back in stock</label>
    </Modal>
  );
}
