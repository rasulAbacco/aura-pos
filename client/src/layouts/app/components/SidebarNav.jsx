import { NavLink } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import { NAV_ITEMS } from '../navItems.js';

export function SidebarNav({ can }) {
  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV_ITEMS.filter((n) => !n.perm || can(n.perm)).map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium', isActive ? 'bg-rose-50 text-rose-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900')}>
          <Icon className="shrink-0" aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
