/** Reports: pick a period, see the headline figures and staff ledger, download CSVs for your accountant. */
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { downloadCsv } from '../../utils/download.js';
import { PageHeader, ErrorNote, Skeleton } from '../../components/ui';
import { PayoutLedger } from '../staff';
import { DateRangeBar } from './components/DateRangeBar.jsx';
import { SummaryGrid } from './components/SummaryGrid.jsx';
import { ExportCard } from './components/ExportCard.jsx';
import { presetRange } from './utils/datePresets.js';

export default function ReportsPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [range, setRange] = useState(() => presetRange('month'));
  const q = `from=${range.from}&to=${range.to}`;
  const pnl = useApi(`/pnl?${q}`);
  const ledger = useApi(`/reports/staff-ledger?${q}`);
  const canExport = can('reports.export');
  const dl = (name) => downloadCsv(`/reports/export/${name}.csv?${q}`, toast);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <PageHeader title="Reports" subtitle="Figures for any period. CSV files open in Excel or Google Sheets." />
      <DateRangeBar range={range} onChange={setRange} />
      {pnl.error ? <ErrorNote onRetry={pnl.reload}>{pnl.error}</ErrorNote> : pnl.loading || !pnl.data ? <Skeleton rows={2} /> : <SummaryGrid pnl={pnl.data} />}
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Downloads</h2>
        {!canExport && <p className="mb-2 text-sm text-stone-600">Your role can view reports but not download them. Ask the owner for the “reports.export” permission.</p>}
        <div className="grid gap-3 md:grid-cols-3">
          <ExportCard title="Invoices" description="Every bill and credit note with tax split and payment methods." disabled={!canExport} onDownload={() => dl('invoices')} />
          <ExportCard title="Expenses" description="Running costs by category, date and payment mode." disabled={!canExport} onDownload={() => dl('expenses')} />
          <ExportCard title="Staff ledger" description="Services done, commission, tips and estimated payout per person." disabled={!canExport} onDownload={() => dl('staff-ledger')} />
        </div>
      </section>
      <section>
        <h2 className="mb-2 font-display text-lg font-bold">Staff ledger</h2>
        <PayoutLedger ledger={ledger} canExport={canExport} onExport={() => dl('staff-ledger')} />
      </section>
    </div>
  );
}
