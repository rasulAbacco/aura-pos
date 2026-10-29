import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { money } from '../../../utils/format.js';
import { ChartCard, axisTick, rupeeK, CHART_COLORS as C } from '../../../components/charts';

/** Revenue bars (greens) against cost bars (greys and rose). */
export function MoneyInOutChart({ pnl: d }) {
  const bars = [
    { name: 'Services', value: Number(d.revenue.services), fill: C.revenue },
    { name: 'Retail', value: Number(d.revenue.products), fill: C.revenueLight },
    { name: 'Memberships', value: Number(d.revenue.memberships), fill: C.revenuePale },
    { name: 'Base pay', value: Number(d.staff.baseSalaries), fill: C.staff },
    { name: 'Commission', value: Number(d.staff.commissions), fill: C.staffLight },
    { name: 'Expenses', value: Number(d.expenses.total), fill: C.expense },
  ];
  return (
    <ChartCard title="Money in vs money out" className="lg:col-span-7">
      <ResponsiveContainer>
        <BarChart data={bars} margin={{ left: 0, right: 8 }}>
          <XAxis dataKey="name" tick={axisTick} interval={0} />
          <YAxis tickFormatter={rupeeK} tick={axisTick} width={48} />
          <Tooltip formatter={(v) => money(v)} cursor={{ fill: '#f5f5f4' }} />
          <Bar isAnimationActive={false} dataKey="value" radius={[4, 4, 0, 0]}>{bars.map((b) => <Cell key={b.name} fill={b.fill} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
