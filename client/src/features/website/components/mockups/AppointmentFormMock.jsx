import { LuChevronDown, LuCalendarDays } from 'react-icons/lu';
import { Avatar } from './MockParts.jsx';

/** "New Appointment" form card (about page). */
export function AppointmentFormMock({ avatars }) {
  const field = (label, value, avatar) => (
    <div><p className="mb-1 text-[9px] text-stone-500">{label}</p>
      <div className="flex items-center gap-1.5 rounded-md border border-stone-200 px-2 py-1.5 text-[10px] text-ink">{avatar && <Avatar src={avatar} className="h-4 w-4" />}<span className="flex-1">{value}</span><LuChevronDown size={10} className="text-stone-400" /></div></div>
  );
  return (
    <div className="site-card w-60 space-y-2.5 p-4 text-left">
      <p className="flex items-center justify-between text-xs font-semibold text-ink">New Appointment <LuCalendarDays size={12} className="text-mauve" /></p>
      {field('Client', 'Pooja Sharma', avatars[0])}
      {field('Service', 'Hair Spa')}
      {field('Stylist', 'Ananya', avatars[1])}
      {field('Date & Time', 'Tue, 28 Oct 2026 11:30 AM')}
      <span className="block rounded-md bg-mauve py-2 text-center text-[10px] font-semibold text-white">Book Appointment</span>
    </div>
  );
}
