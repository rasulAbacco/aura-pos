import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { money } from '../../../utils/format.js';
import { ChartCard, axisTick, rupeeK, CHART_COLORS } from '../../../components/charts';

export function RevenueTrendChart({ trend }) {
  return (
    <ChartCard title="Revenue, last 14 days" className="lg:col-span-2" height="h-52" empty={trend.length ? null : 'Revenue appears here once you settle bills.'}>
      <ResponsiveContainer>
        <AreaChart data={trend.map((t) => ({ ...t, revenue: Number(t.revenue) }))}>
          <XAxis dataKey="day" tickFormatter={(v) => v.slice(8)} tick={axisTick} />
          <YAxis tickFormatter={rupeeK} width={44} tick={axisTick} />
          <Tooltip formatter={(v) => money(v)} />
          <Area dataKey="revenue" stroke={CHART_COLORS.expense} fill={CHART_COLORS.accentFill} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
