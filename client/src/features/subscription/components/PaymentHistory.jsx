import { money0, dateTime } from '../../../utils/format.js';
import { Badge } from '../../../components/ui';

export function PaymentHistory({ payments }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-stone-700">Payment history</h2>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500"><tr><th className="px-4 py-2">Date</th><th className="px-4">Plan</th><th className="px-4">Status</th><th className="px-4">Reference</th><th className="px-4 text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-stone-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2">{dateTime(p.createdAt)}</td><td className="px-4">{p.plan.name}</td>
                <td className="px-4"><Badge tone={p.status === 'CAPTURED' ? 'green' : p.status === 'FAILED' ? 'rose' : 'stone'}>{p.status === 'CREATED' ? 'Not completed' : p.status.toLowerCase()}</Badge></td>
                <td className="num px-4 text-xs text-stone-500">{p.providerPaymentId ?? p.providerOrderId}</td><td className="num px-4 text-right">{money0(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
