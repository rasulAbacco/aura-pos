import { money, dateTime } from '../../../utils/format.js';
import { Badge, ErrorNote, Skeleton } from '../../../components/ui';
import { DataTable } from '../../../components/tables';
import { usePlatformApi } from '../hooks/usePlatformApi.js';
import { PAYMENT_TONE } from '../utils/platform.constants.js';

/** Subscription payments as verified by the server (signature or webhook) — never the browser's word. */
export function PaymentsPanel() {
  const p = usePlatformApi('/payments?pageSize=100');
  const columns = [
    { key: 'createdAt', header: 'When', render: (r) => dateTime(r.createdAt) },
    { key: 'tenant', header: 'Salon', render: (r) => r.tenant?.displayName },
    { key: 'plan', header: 'Plan', render: (r) => r.plan?.name ?? '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => money(r.amount) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={PAYMENT_TONE[r.status]}>{r.status}</Badge> },
    { key: 'ref', header: 'Razorpay ref', render: (r) => <span className="font-mono text-xs">{r.providerPaymentId ?? r.providerOrderId ?? '—'}</span> },
  ];
  if (p.error) return <ErrorNote onRetry={p.reload}>{p.error}</ErrorNote>;
  return p.loading ? <Skeleton /> : <DataTable columns={columns} rows={p.data} minWidth={760} empty="No payments yet." />;
}
