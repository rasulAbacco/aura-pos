/** Staff & payroll: team directory (tab 1) and the commission / payout ledger (tab 2). */
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { todayISO } from '../../utils/format.js';
import { downloadCsv } from '../../utils/download.js';
import { Button, PageHeader, ErrorNote, Skeleton, Empty } from '../../components/ui';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { cx } from '../../utils/cx.js';
import { StaffCard } from './components/StaffCard.jsx';
import { StaffModal } from './components/StaffModal.jsx';
import { PayoutLedger } from './components/PayoutLedger.jsx';

export default function StaffPage() {
  const { can, writable } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('team');
  const from = `${todayISO().slice(0, 7)}-01`;
  const to = todayISO();
  const staff = useApi('/staff');
  const ledger = useApi(tab === 'ledger' && can('reports.view') ? `/reports/staff-ledger?from=${from}&to=${to}` : null);
  const [modal, setModal] = useState(null);
  const canManage = can('staff.manage') && writable;
  const tabs = [['team', 'Team'], ...(can('reports.view') ? [['ledger', 'Commission & payout ledger']] : [])];

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Staff & payroll" subtitle="Team directory, commission rates and this month’s estimated payouts."
        actions={canManage && <Button variant="primary" onClick={() => setModal({})}>Add staff</Button>} />
      <div className="mb-4 flex gap-1 rounded-lg bg-stone-200/60 p-1 text-sm font-semibold sm:w-fit" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('rounded-md px-4 py-1.5', tab === k ? 'bg-white shadow-sm' : 'text-stone-600')}>{l}</button>)}
      </div>
      {tab === 'team' && (staff.loading ? <Skeleton /> : staff.error ? <ErrorNote onRetry={staff.reload}>{staff.error}</ErrorNote> : !staff.data?.length
        ? <Empty title="No staff yet">Add stylists and therapists to assign services and track commission.</Empty>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{staff.data.map((s) => <StaffCard key={s.id} person={s} onEdit={canManage ? (p) => setModal({ person: p }) : null} />)}</div>)}
      {tab === 'ledger' && <PayoutLedger ledger={ledger} canExport={can('reports.export')} onExport={() => downloadCsv(`/reports/export/staff-ledger.csv?from=${from}&to=${to}`, toast)} />}
      {modal && <StaffModal person={modal.person} onClose={() => setModal(null)} onSaved={() => { setModal(null); staff.reload(); }} />}
    </div>
  );
}
