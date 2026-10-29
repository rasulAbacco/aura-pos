/** Running expenses: filter by dates and category, record new ones, void mistakes (kept in the audit trail). */
import { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth.js';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { todayISO } from '../../utils/format.js';
import { downloadCsv } from '../../utils/download.js';
import { Button, PageHeader, ErrorNote } from '../../components/ui';
import { Field } from '../../components/forms';
import { CATEGORY_LABELS } from './utils/expenses.constants.js';
import { ExpenseList } from './components/ExpenseList.jsx';
import { ExpenseModal } from './components/ExpenseModal.jsx';
import { VoidExpenseModal } from './components/VoidExpenseModal.jsx';

export default function ExpensesPage() {
  const { can, writable } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ from: `${todayISO().slice(0, 7)}-01`, to: todayISO(), category: '' });
  const expenses = useApi(`/expenses?from=${f.from}&to=${f.to}${f.category ? `&category=${f.category}` : ''}&pageSize=100`);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState(null);
  const canManage = can('expenses.manage') && writable;

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Expenses" subtitle="Rent, utilities, supplies, laundry, marketing and other running costs. They feed the profit & loss."
        actions={<>
          {canManage && <Button variant="primary" onClick={() => setAdding(true)}>Record expense</Button>}
          {can('reports.export') && <Button onClick={() => downloadCsv(`/reports/export/expenses.csv?from=${f.from}&to=${f.to}`, toast)}><FiDownload /> CSV</Button>}
        </>} />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Field label="From" type="date" value={f.from} max={f.to} onChange={(e) => setF({ ...f, from: e.target.value })} />
        <Field label="To" type="date" value={f.to} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} />
        <Field as="select" label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Field>
      </div>
      {expenses.error && <ErrorNote onRetry={expenses.reload}>{expenses.error}</ErrorNote>}
      <div className="max-w-4xl"><ExpenseList expenses={expenses} canManage={canManage} onVoid={setVoiding} /></div>
      {adding && <ExpenseModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); expenses.reload(); }} />}
      {voiding && <VoidExpenseModal expense={voiding} onClose={() => setVoiding(null)} onDone={() => { setVoiding(null); expenses.reload(); }} />}
    </div>
  );
}
