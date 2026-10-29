import { money } from '../../../utils/format.js';
import { ErrorNote, Skeleton } from '../../../components/ui';
import { usePlatformApi } from '../hooks/usePlatformApi.js';

export function StatsOverview() {
  const s = usePlatformApi('/stats');
  if (s.loading) return <Skeleton rows={2} />;
  if (s.error) return <ErrorNote onRetry={s.reload}>{s.error}</ErrorNote>;
  const d = s.data;
  const cards = [
    ['Salons', d.tenants], ['Suspended', d.suspended], ['Payments this month', d.paymentsThisMonth],
    ['Collected this month', money(d.revenueThisMonth)], ['Failed webhooks', d.failedWebhooks], ['New enquiries', d.newContacts],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(([l, v]) => <div key={l} className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">{l}</p><p className="num mt-1 text-2xl font-extrabold">{v}</p></div>)}
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold">Subscriptions by status</p>
        <div className="flex flex-wrap gap-2">{Object.entries(d.subscriptionsByStatus).map(([k, v]) => <span key={k} className="rounded-md bg-stone-100 px-2 py-1">{k}: <b>{v}</b></span>)}</div>
      </div>
    </div>
  );
}
