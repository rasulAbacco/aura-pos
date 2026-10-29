import { ResponsiveContainer, Cell, PieChart, Pie, Legend, Tooltip } from 'recharts';
import { money } from '../../../utils/format.js';
import { ChartCard, CHART_PALETTE } from '../../../components/charts';
import { CATEGORY_LABELS } from '../../expenses';

export function CostBreakdownChart({ pnl: d }) {
  const slices = [
    { name: 'Base pay', value: Number(d.staff.baseSalaries) },
    { name: 'Commission', value: Number(d.staff.commissions) },
    ...Object.entries(d.expenses.byCategory).filter(([, v]) => Number(v) > 0).map(([k, v]) => ({ name: CATEGORY_LABELS[k], value: Number(v) })),
  ];
  return (
    <ChartCard title="Where the money goes" className="lg:col-span-5" empty={slices.every((x) => !x.value) ? 'No costs in this period.' : null}>
      <ResponsiveContainer>
        <PieChart>
          <Pie isAnimationActive={false} data={slices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={1}>
            {slices.map((x, i) => <Cell key={x.name} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => money(v)} /><Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
