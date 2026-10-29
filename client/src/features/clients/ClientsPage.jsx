/** Client CRM: search, add, wallet ledger, start a bill. */
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { Button, PageHeader, Empty, ErrorNote, Skeleton } from '../../components/ui';
import { useApi } from '../../hooks/useApi.js';
import { NewClientModal } from './components/NewClientModal.jsx';
import { WalletModal } from './components/WalletModal.jsx';
import { ClientsTable } from './components/ClientsTable.jsx';

const PAGE_SIZE = 25;

export default function ClientsPage() {
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const list = useApi(`/clients?q=${encodeURIComponent(q)}&page=${page}&pageSize=${PAGE_SIZE}`);
  const [modal, setModal] = useState(null);
  const addButton = can('customers.manage') && <Button variant="primary" onClick={() => setModal({ kind: 'new' })}>New client</Button>;

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Clients" subtitle="Profiles, colour formulas, patch tests, memberships and prepaid wallets." actions={addButton} />
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search by name, phone, email or membership" aria-label="Search clients" className="mb-4 w-full max-w-md rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" />
      {list.error && <ErrorNote onRetry={list.reload}>{list.error}</ErrorNote>}
      {list.loading ? <Skeleton /> : !list.data?.length ? (
        <Empty title={q ? 'No clients match your search' : 'No clients yet'} action={addButton}>Clients you add here appear at the billing counter.</Empty>
      ) : (
        <ClientsTable clients={list.data} canBill={can('pos.bill')} onWallet={(c) => setModal({ kind: 'wallet', client: c })}
          page={page} total={list.meta?.total ?? 0} pageSize={PAGE_SIZE} onPage={setPage} />
      )}
      {modal?.kind === 'new' && <NewClientModal onClose={() => setModal(null)} onCreated={() => { setModal(null); list.reload(); }} />}
      {modal?.kind === 'wallet' && <WalletModal client={modal.client} onClose={() => setModal(null)} onDone={list.reload} />}
    </div>
  );
}
