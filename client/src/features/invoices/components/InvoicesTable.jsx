import { money, dateTime } from '../../../utils/format.js';
import { Badge, Button } from '../../../components/ui';
import { STATUS_LABEL, STATUS_TONE } from '../utils/invoices.constants.js';

export function InvoicesTable({ invoices, canRefund, canVoid, onView, onRefund, onVoid }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-stone-50 text-left text-xs text-stone-500"><tr><th className="px-4 py-2">Number</th><th className="px-4">Issued</th><th className="px-4">Client</th><th className="px-4">Status</th><th className="px-4 text-right">Total</th><th className="px-4" /></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {invoices.map((i) => (
            <tr key={i.id}>
              <td className="num px-4 py-2.5 font-semibold">{i.number} {i.kind === 'CREDIT_NOTE' && <Badge tone="blue">Credit note</Badge>}</td>
              <td className="px-4 text-stone-600">{dateTime(i.issuedAt)}</td>
              <td className="px-4">{i.customerSnapshot?.name ?? <span className="text-stone-400">Walk-in</span>}</td>
              <td className="px-4"><Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge></td>
              <td className="num px-4 text-right font-semibold">{money(i.grandTotal)}</td>
              <td className="space-x-1 whitespace-nowrap px-4 text-right">
                <Button size="sm" variant="ghost" onClick={() => onView(i)}>View</Button>
                {i.kind === 'INVOICE' && !['VOID', 'REFUNDED'].includes(i.status) && canRefund && <Button size="sm" variant="ghost" onClick={() => onRefund(i)}>Refund</Button>}
                {i.kind === 'INVOICE' && i.status === 'PAID' && canVoid && <Button size="sm" variant="ghost" onClick={() => onVoid(i)}>Void</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
