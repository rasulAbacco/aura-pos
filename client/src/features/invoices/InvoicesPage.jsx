/** Invoice history: search, reprint, refund (credit note), void. */
import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { todayISO } from '../../utils/format.js';
import { downloadCsv } from '../../utils/download.js';
import { Button, PageHeader, ErrorNote, Skeleton, Empty } from '../../components/ui';
import { Field } from '../../components/forms';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { ReceiptModal } from '../../components/receipt/Receipt.jsx';
import { InvoicesTable } from './components/InvoicesTable.jsx';
import { RefundModal } from './components/RefundModal.jsx';
import { VoidInvoiceModal } from './components/VoidInvoiceModal.jsx';

export default function InvoicesPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(`${todayISO().slice(0, 7)}-01`);
  const list = useApi(`/invoices?q=${encodeURIComponent(q)}&from=${from}&pageSize=50`);
  const [viewing, setViewing] = useState(null);
  const [refunding, setRefunding] = useState(null);
  const [voiding, setVoiding] = useState(null);

  // Full invoice (with lines) is fetched on demand for receipt / refund.
  const load = async (inv, then) => { try { then((await api.get(`/invoices/${inv.id}`)).data.data); } catch (e) { toast(errorMessage(e), 'error'); } };

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Invoices" subtitle="Search, reprint, refund or void. Reprinting never creates a new bill."
        actions={can('reports.export') && <Button onClick={() => downloadCsv(`/reports/export/invoices.csv?from=${from}&to=${todayISO()}`, toast)}><FiDownload /> Export CSV</Button>} />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Field label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice no., client name or phone" className="w-72" />
        <Field label="Issued since" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      {list.error && <ErrorNote onRetry={list.reload}>{list.error}</ErrorNote>}
      {list.loading ? <Skeleton /> : !list.data?.length ? <Empty title="No invoices for these filters">Bills settled at the counter appear here.</Empty> : (
        <InvoicesTable invoices={list.data} canRefund={can('pos.refund')} canVoid={can('pos.void')}
          onView={(i) => load(i, setViewing)} onRefund={(i) => load(i, setRefunding)} onVoid={setVoiding} />
      )}
      <ReceiptModal invoice={viewing} onClose={() => setViewing(null)} />
      {refunding && <RefundModal invoice={refunding} onClose={() => setRefunding(null)} onDone={() => { setRefunding(null); list.reload(); }} />}
      {voiding && <VoidInvoiceModal invoice={voiding} onClose={() => setVoiding(null)} onDone={() => { setVoiding(null); list.reload(); }} />}
    </div>
  );
}
