/** Today at a glance — every number comes from settled bills and bookings in the database. */
import { useAuth } from '../../hooks/useAuth.js';
import { money0 } from '../../utils/format.js';
import { PageHeader, ErrorNote, Skeleton } from '../../components/ui';
import { useApi } from '../../hooks/useApi.js';
import { StatCard } from './components/StatCard.jsx';
import { TodayHero } from './components/TodayHero.jsx';
import { RevenueTrendChart } from './components/RevenueTrendChart.jsx';
import { TodayQueue } from './components/TodayQueue.jsx';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };

export default function DashboardPage() {
  const { me, can } = useAuth();
  const d = useApi('/reports/dashboard');
  const s = d.data?.sales;
  return (
    <div className="p-4 md:p-6">
      <PageHeader title={`Good ${greeting()}, ${me?.user.name.split(' ')[0]}`} subtitle="Today at a glance, from settled bills and bookings." />
      {d.error && <ErrorNote onRetry={d.reload}>{d.error}</ErrorNote>}
      {d.loading ? <Skeleton rows={6} /> : d.data && (
        <div className="space-y-5">
          {s && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <TodayHero sales={s} />
              <StatCard label="Services (net of discount)" value={money0(s.serviceRevenue)} />
              <StatCard label="Retail" value={money0(s.productRevenue)} />
              <StatCard label="Balance due on bills" value={money0(s.outstanding)} warn={Number(s.outstanding) > 0} />
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            {s && <RevenueTrendChart trend={s.trend} />}
            <TodayQueue byStatus={d.data.appointmentsByStatus ?? {}} upcoming={d.data.upcoming} canOpen={can('appointments.view')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Products at or below minimum stock" value={d.data.lowStockCount} warn={d.data.lowStockCount > 0} link={d.data.lowStockCount > 0 ? '/app/catalog' : undefined} />
            <StatCard label="New clients today" value={d.data.newCustomersToday} />
            <StatCard label="Plan" value={d.data.subscription.planName ?? 'None'} note={d.data.subscription.periodEnd ? `Until ${new Date(d.data.subscription.periodEnd).toLocaleDateString('en-IN')}` : d.data.subscription.reason} link="/app/subscription" />
          </div>
        </div>
      )}
    </div>
  );
}
