import { dateTime } from '../../../utils/format.js';
import { Badge, ErrorNote, Skeleton } from '../../../components/ui';
import { DataTable } from '../../../components/tables';
import { usePlatformApi } from '../hooks/usePlatformApi.js';
import { WEBHOOK_TONE } from '../utils/platform.constants.js';

export function WebhooksPanel() {
  const w = usePlatformApi('/webhooks');
  const columns = [
    { key: 'receivedAt', header: 'Received', render: (r) => dateTime(r.receivedAt) },
    { key: 'eventType', header: 'Event', render: (r) => <span className="font-mono text-xs">{r.eventType}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={WEBHOOK_TONE[r.status]}>{r.status}</Badge> },
    { key: 'attempts', header: 'Attempts', align: 'right' },
    { key: 'error', header: 'Error', render: (r) => <span className="text-rose-700">{r.error ?? ''}</span> },
  ];
  if (w.error) return <ErrorNote onRetry={w.reload}>{w.error}</ErrorNote>;
  return w.loading ? <Skeleton /> : <DataTable columns={columns} rows={w.data} minWidth={720} empty="No webhook events received yet." />;
}
