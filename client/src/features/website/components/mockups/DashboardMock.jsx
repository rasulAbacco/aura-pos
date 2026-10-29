import { LuReceiptText, LuCalendarPlus, LuUserPlus, LuPackagePlus } from 'react-icons/lu';
import { MockSidebar, MockTopBar, Pill } from './MockParts.jsx';

const ROWS = [['10:00', 'Anitha R.', 'Hair Spa', 'Checked in', 'green'], ['11:30', 'Kavya S.', 'Facial', 'Upcoming', 'blue'], ['01:00', 'Meera K.', 'Hair Cut', 'Upcoming', 'amber'], ['03:00', 'Sneha P.', 'Manicure', 'Upcoming', 'amber']];
const ACTIONS = [[LuReceiptText, 'New Bill'], [LuCalendarPlus, 'New Appointment'], [LuUserPlus, 'Add Client'], [LuPackagePlus, 'Add Product']];

/** Illustrated dashboard: today's schedule + quick actions. `stats` adds the KPI row (features hero). */
export function DashboardMock({ stats = false }) {
  return (
    <div className="flex aspect-[4/3] text-left">
      <MockSidebar />
      <div className="min-w-0 flex-1 bg-[#fcfafa]">
        <MockTopBar />
        <div className="space-y-2.5 p-3">
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              {[["Today's Appointments", '12'], ['Total Sales', '₹12,480'], ['New Clients', '8']].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-stone-100 bg-white p-2"><p className="text-[7px] text-stone-500">{l}</p><p className="mt-0.5 text-[12px] font-bold text-ink">{v}</p>
                  <svg viewBox="0 0 60 14" className="mt-1 h-3 w-full text-emerald-500" aria-hidden><polyline fill="none" stroke="currentColor" strokeWidth="1.3" points="0,11 10,9 20,10 30,6 40,7 50,3 60,4" /></svg></div>
              ))}
            </div>
          )}
          <div className="rounded-lg border border-stone-100 bg-white p-2.5">
            <div className="mb-1.5 flex items-center justify-between"><p className="text-[8px] font-semibold text-ink">{stats ? 'Upcoming Appointments' : 'Today'}<span className="block font-normal text-stone-400">Tue, 28 Oct 2026</span></p><span className="text-[7px] font-semibold text-mauve">See all</span></div>
            <ul className="divide-y divide-stone-50">
              {ROWS.map(([t, n, s, st, tone]) => (
                <li key={t} className="flex items-center gap-2 py-1 text-[7.5px]"><span className="w-6 text-stone-500">{t}</span><span className="flex-1"><b className="block text-ink">{n}</b><span className="text-stone-400">{s}</span></span><Pill tone={tone}>{st}</Pill></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-[8px] font-semibold text-ink">Quick Actions</p>
            <div className="grid grid-cols-4 gap-1.5">
              {ACTIONS.map(([Icon, l]) => <div key={l} className="flex flex-col items-center gap-1 rounded-lg border border-stone-100 bg-white py-1.5 text-[6.5px] text-stone-600"><Icon size={11} className="text-mauve" aria-hidden />{l}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
