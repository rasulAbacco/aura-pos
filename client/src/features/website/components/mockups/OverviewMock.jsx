import { LuCalendarDays, LuUsers, LuBox, LuChartColumnIncreasing } from 'react-icons/lu';
import { MockSidebar } from './MockParts.jsx';

const CARDS = [['Appointments', '12', LuCalendarDays, '+20%'], ['Total Sales', '₹12,480', LuChartColumnIncreasing, ''], ['New Clients', '8', LuUsers, ''], ['Products Sold', '24', LuBox, '']];

/** Illustrated "Today's Overview" screen (pricing, about pages). */
export function OverviewMock() {
  return (
    <div className="flex aspect-[16/10] text-left">
      <MockSidebar />
      <div className="flex-1 bg-[#fcfafa] p-3">
        <p className="mb-2 text-[9px] font-semibold text-ink">Today’s Overview</p>
        <div className="grid grid-cols-2 gap-2">
          {CARDS.map(([l, v, Icon, d]) => (
            <div key={l} className="rounded-lg border border-stone-100 bg-white p-2.5">
              <p className="text-[7.5px] text-stone-500">{l}</p>
              <div className="mt-1 flex items-end justify-between"><p className="text-[13px] font-bold text-ink">{v} {d && <span className="text-[7px] font-semibold text-emerald-600">{d}</span>}</p><Icon size={12} className="text-mauve" aria-hidden /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
