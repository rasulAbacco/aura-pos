import { errorMessage } from '../../../lib/api.js';
import { dateTime } from '../../../utils/format.js';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { ErrorNote, Skeleton } from '../../../components/ui';
import { DataTable } from '../../../components/tables';
import { usePlatformApi } from '../hooks/usePlatformApi.js';
import { platformApi } from '../utils/platformApi.js';
import { CONTACT_STATUSES } from '../utils/platform.constants.js';

/** Messages sent from the website contact form. */
export function ContactsPanel() {
  const toast = useToast();
  const c = usePlatformApi('/contacts');
  const setStatus = async (row, status) => {
    try { await platformApi.patch(`/contacts/${row.id}`, { status }); c.reload(); } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const columns = [
    { key: 'createdAt', header: 'When', render: (r) => dateTime(r.createdAt) },
    { key: 'name', header: 'From', render: (r) => <><b>{r.name}</b><span className="block text-xs text-stone-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</span></> },
    { key: 'message', header: 'Message', render: (r) => <><span className="font-semibold">{r.subject}</span><span className="block max-w-md whitespace-pre-wrap text-stone-600">{r.message}</span></> },
    { key: 'status', header: 'Status', render: (r) => (
      <select aria-label="Status" className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm" value={r.status} onChange={(e) => setStatus(r, e.target.value)}>
        {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>)}
      </select>
    ) },
  ];
  if (c.error) return <ErrorNote onRetry={c.reload}>{c.error}</ErrorNote>;
  return c.loading ? <Skeleton /> : <DataTable columns={columns} rows={c.data} minWidth={820} empty="No enquiries yet." />;
}
