import { LuPlus } from 'react-icons/lu';
import { Avatar, Pill } from './MockParts.jsx';

const ROWS = [['Ananya', 'Senior Stylist', 'Stylist', '30%'], ['Deepak', 'Stylist', 'Stylist', '25%'], ['Rohan', 'Manager', 'Manager', '—']];

/** Staff list with commission rates (features page, section 06). */
export function StaffTableMock({ avatars }) {
  return (
    <div className="site-card p-4 text-left text-[11px]">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-ink">Staff Members</p><span className="flex items-center gap-1 text-[10px] font-semibold text-mauve"><LuPlus size={11} />Add Staff</span></div>
      <table className="w-full">
        <thead className="text-left text-[10px] text-stone-500"><tr className="border-b border-stone-100"><th className="py-1 font-medium" /><th className="font-medium">Role</th><th className="font-medium">Commission</th><th className="font-medium">Status</th></tr></thead>
        <tbody>{ROWS.map(([n, t, r, c], i) => (
          <tr key={n} className="border-b border-stone-50 text-ink"><td className="py-2"><span className="flex items-center gap-2"><Avatar src={avatars[i]} className="h-7 w-7" /><span><b className="block">{n}</b><span className="text-[10px] text-stone-500">{t}</span></span></span></td><td>{r}</td><td>{c}</td><td><Pill tone="green">Active</Pill></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
