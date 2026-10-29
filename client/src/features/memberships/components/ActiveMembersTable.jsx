import { money, date } from '../../../utils/format.js';

export function ActiveMembersTable({ members }) {
  if (!members.length) return <p className="text-sm text-stone-500">No active members yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-stone-50 text-left text-xs text-stone-500"><tr><th className="px-4 py-2">Client</th><th className="px-4">Plan</th><th className="px-4">Valid until</th><th className="px-4 text-right">Wallet</th></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {members.map((m) => (
            <tr key={m.id}><td className="px-4 py-2.5"><b>{m.customer.name}</b><span className="ml-2 text-xs text-stone-500">{m.customer.phone}</span></td><td className="px-4">{m.plan.name} ({Number(m.plan.discountPercent)}%)</td><td className="px-4">{date(m.endsAt)}</td><td className="num px-4 text-right">{money(m.customer.walletBalance)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
