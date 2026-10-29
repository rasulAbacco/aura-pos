import { FiUserPlus } from 'react-icons/fi';
import { money } from '../../../utils/format.js';

/** Top of the bill: choose the client and see their membership and wallet. */
export function ClientPicker({ clients, customerId, customer, onChange, onNewClient }) {
  return (
    <div className="space-y-2 border-b border-dashed border-stone-300 px-4 pb-3 pt-4">
      <div className="flex items-center justify-between">
        <label htmlFor="pos-client" className="text-xs font-semibold text-stone-600">Client</label>
        {onNewClient && <button onClick={onNewClient} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"><FiUserPlus /> New client</button>}
      </div>
      <select id="pos-client" value={customerId} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
        <option value="">Walk-in (no client)</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
      </select>
      {customer && (
        <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-xs">
          <span>{customer.activeMembership ? <><b className="text-rose-800">{customer.activeMembership.planName}</b> · {Number(customer.activeMembership.discountPercent)}% member discount</> : 'No active membership'}</span>
          <span className="num font-semibold">Wallet {money(customer.walletBalance)}</span>
        </div>
      )}
    </div>
  );
}
