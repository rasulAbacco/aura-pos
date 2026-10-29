import { useState } from 'react';
import { errorMessage } from '../../../lib/api.js';
import { date } from '../../../utils/format.js';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { Badge, Button, ErrorNote, Skeleton } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { DataTable } from '../../../components/tables';
import { ConfirmDialog } from '../../../components/modals';
import { usePlatformApi } from '../hooks/usePlatformApi.js';
import { platformApi } from '../utils/platformApi.js';
import { STATE_TONE } from '../utils/platform.constants.js';

/** Salon accounts. Suspension needs a reason, is audited, and signs the salon's users out. */
export function TenantsPanel() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const list = usePlatformApi(`/tenants?pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const [action, setAction] = useState(null);
  const run = async (reason) => {
    try { await platformApi.post(`/tenants/${action.tenant.id}/${action.kind}`, { reason }); toast(`${action.tenant.displayName}: ${action.kind === 'suspend' ? 'suspended' : 'reactivated'}`); setAction(null); list.reload(); }
    catch (e) { toast(errorMessage(e), 'error'); }
  };
  const columns = [
    { key: 'displayName', header: 'Salon', render: (t) => <><b>{t.displayName}</b><span className="block text-xs text-stone-500">{t.slug}</span></> },
    { key: 'plan', header: 'Plan', render: (t) => t.plan ?? '—' },
    { key: 'effectiveState', header: 'Access', render: (t) => <Badge tone={STATE_TONE[t.effectiveState]}>{t.effectiveState}</Badge> },
    { key: 'periodEnd', header: 'Paid until', render: (t) => (t.periodEnd ? date(t.periodEnd) : '—') },
    { key: 'users', header: 'Users', align: 'right' },
    { key: 'createdAt', header: 'Joined', render: (t) => date(t.createdAt) },
    { key: 'a', header: '', align: 'right', render: (t) => (t.status === 'SUSPENDED'
      ? <Button size="sm" onClick={() => setAction({ kind: 'reactivate', tenant: t })}>Reactivate</Button>
      : <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'suspend', tenant: t })}>Suspend</Button>) },
  ];
  return (
    <div className="space-y-3">
      <Field label="Search salons" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, slug or user email" className="max-w-sm" />
      {list.error ? <ErrorNote onRetry={list.reload}>{list.error}</ErrorNote> : list.loading ? <Skeleton /> : <DataTable columns={columns} rows={list.data} minWidth={820} empty="No salons match." />}
      {action && (
        <ConfirmDialog danger={action.kind === 'suspend'} minReason={5}
          title={`${action.kind === 'suspend' ? 'Suspend' : 'Reactivate'} ${action.tenant.displayName}?`}
          description={action.kind === 'suspend' ? 'Their staff are signed out and the salon becomes read-only for billing. A payment does not lift a suspension.' : 'Access returns according to their current subscription.'}
          confirmLabel={action.kind === 'suspend' ? 'Suspend salon' : 'Reactivate'} reasonLabel="Reason (kept in the audit log)" reasonPlaceholder="Chargeback under review"
          onConfirm={run} onClose={() => setAction(null)} />
      )}
    </div>
  );
}
