import { useState } from 'react';
import { api, errorMessage } from '../../../lib/api.js';
import { money, date } from '../../../utils/format.js';
import { Button, Skeleton } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { Modal } from '../../../components/modals';
import { useApi } from '../../../hooks/useApi.js';
import { useToast } from '../../../contexts/ToastContext.jsx';

/** Prepaid wallet: full ledger plus top-up / correction (always with a reason). */
export function WalletModal({ client, onClose, onDone }) {
  const toast = useToast();
  const ledger = useApi(`/clients/${client.id}/wallet`);
  const [f, setF] = useState({ amount: '', reason: '', type: 'TOPUP' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.post(`/clients/${client.id}/wallet/adjust`, { ...f, amount: Number(f.amount) });
      toast('Wallet updated'); ledger.reload(); onDone(); setF({ amount: '', reason: '', type: 'TOPUP' });
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open wide onClose={onClose} title={`${client.name} — wallet`} description="Every credit and debit is a ledger entry with a reason. Balances can't be edited directly.">
      <div className="mb-4 grid gap-2 sm:grid-cols-[8rem_1fr_7rem_auto] sm:items-end">
        <Field as="select" label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="TOPUP">Top-up</option><option value="ADJUSTMENT">Correction (±)</option></Field>
        <Field label="Reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Prepaid ₹5,000 package" />
        <Field label="Amount ₹" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        <Button variant="primary" onClick={save} loading={busy} disabled={!f.amount || f.reason.length < 5}>Record</Button>
      </div>
      {ledger.loading ? <Skeleton rows={3} /> : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-stone-500"><tr><th className="py-1">Date</th><th>Type</th><th>Reason</th><th className="text-right">Amount</th><th className="text-right">Balance</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {ledger.data?.entries.map((e) => (
              <tr key={e.id}><td className="py-1.5">{date(e.createdAt)}</td><td>{e.type}</td><td className="text-stone-600">{e.reason}</td><td className={`num text-right ${Number(e.amount) < 0 ? 'text-rose-700' : 'text-ledger'}`}>{money(e.amount)}</td><td className="num text-right">{money(e.balanceAfter)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
