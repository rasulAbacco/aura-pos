import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

const HOURS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
// [day 0-4, start row, rows, name, service, colour]
const EVENTS = [[0, 0.5, 1.4, 'Anitha R.', 'Hair Spa', 'bg-rose-100 border-rose-300'], [3, 0.4, 1, 'Reena B.', 'Hair Cut', 'bg-sky-100 border-sky-300'], [2, 1.9, 0.9, 'Meera R.', 'Hair Cut', 'bg-emerald-100 border-emerald-300'], [3, 2.5, 1, 'Sneha P.', 'Beard Trim', 'bg-amber-100 border-amber-300'], [0, 3.2, 1.2, 'Deepa B.', 'Grooming', 'bg-indigo-100 border-indigo-300'], [2, 4.2, 0.9, 'Rohan B.', 'Beard Trim', 'bg-indigo-100 border-indigo-300']];

/** Week view of the appointment calendar (features page, section 02). */
export function AppointmentsWeekMock() {
  return (
    <div className="site-card p-4 text-left text-[10px]">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-ink">Appointments</p><span className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className="h-4 w-4 rounded bg-stone-100" />)}</span></div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex rounded-md bg-stone-100 p-0.5 text-[9px] font-semibold">{['Day', 'Week', 'Month'].map((v) => <span key={v} className={`rounded px-2 py-0.5 ${v === 'Week' ? 'bg-white text-mauve shadow-sm' : 'text-stone-500'}`}>{v}</span>)}</span>
        <LuChevronLeft size={12} /><span className="font-semibold text-ink">Tue, 28 Oct 2026</span><LuChevronRight size={12} />
      </div>
      <div className="relative grid grid-cols-[2.5rem_repeat(5,1fr)]">
        {HOURS.map((h) => <div key={h} className="contents"><span className="h-9 border-t border-stone-100 pt-0.5 text-[8px] text-stone-400">{h}</span>{[0, 1, 2, 3, 4].map((d) => <span key={d} className="h-9 border-l border-t border-stone-100" />)}</div>)}
        {EVENTS.map(([d, start, len, n, s, cls]) => (
          <div key={n + d} className={`absolute rounded border-l-2 px-1 py-0.5 text-[8px] leading-tight ${cls}`}
            style={{ left: `calc(2.5rem + (100% - 2.5rem) * ${d / 5} + 2px)`, width: 'calc((100% - 2.5rem) / 5 - 4px)', top: `${start * 2.25}rem`, height: `${len * 2.25}rem` }}>
            <b className="block text-ink">{n}</b><span className="text-stone-600">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
