import { FiDownload } from 'react-icons/fi';
import { money } from '../../../utils/format.js';
import { Button, ErrorNote, Skeleton } from '../../../components/ui';

/** This month's commission, tips, prorated base pay and estimated payout per person. */
export function PayoutLedger({ ledger, canExport, onExport }) {
  if (ledger.error) return <ErrorNote onRetry={ledger.reload}>{ledger.error}</ErrorNote>;
  if (ledger.loading || !ledger.data) return <Skeleton />;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-600">{ledger.data.range.from} to {ledger.data.range.to}. Base pay is prorated from salary settings — an estimate until payroll is approved.</p>
        {canExport && <Button size="sm" onClick={onExport}><FiDownload /> CSV</Button>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-stone-50 text-left text-xs text-stone-500"><tr><th className="px-4 py-2">Staff</th><th className="px-4 text-right">Services</th><th className="px-4 text-right">Net sales</th><th className="px-4 text-right">Commission</th><th className="px-4 text-right">Tips</th><th className="px-4 text-right">Base pay</th><th className="px-4 text-right">Est. payout</th></tr></thead>
          <tbody className="num divide-y divide-stone-100">
            {(ledger.data.staff ?? []).map((s) => (
              <tr key={s.staffId}><td className="px-4 py-2.5 font-semibold">{s.name}</td><td className="px-4 text-right">{s.servicesDone}</td><td className="px-4 text-right">{money(s.sales)}</td><td className="px-4 text-right text-ledger">{money(s.commission)}</td><td className="px-4 text-right">{money(s.tips)}</td><td className="px-4 text-right">{money(s.basePayForPeriod)}</td><td className="px-4 text-right font-bold">{money(s.estimatedPayout)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
