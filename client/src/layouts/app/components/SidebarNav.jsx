import { NavLink } from 'react-router-dom';
import { cx } from '../../../utils/cx.js';
import { NAV_ITEMS } from '../navItems.js';
import { useOnlineSummary, attentionCount } from '../../../lib/onlineSummary.js';

const allowed = (n, can) => (!n.perm || can(n.perm)) && (!n.anyPerm || n.anyPerm.some((p) => can(p)));

/**
 * Main menu. `rail` = desktop icon rail: only icons show until the pointer (or keyboard focus)
 * is on the sidebar, then labels fade in as it widens. The phone drawer always shows labels.
 * "App requests" carries a badge with the customer-app requests waiting for the salon.
 */
export function SidebarNav({ can, rail = false }) {
  const online = useOnlineSummary(can('online.respond') || can('appointments.view') || can('pos.bill'));
  const badges = { online: attentionCount(online) };
  return (
    <nav aria-label="Main" className={cx('flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden', rail ? 'px-2.5 py-3' : 'p-3')}>
      {NAV_ITEMS.filter((n) => allowed(n, can)).map(({ to, label, icon: Icon, end, badge }) => {
        const count = badge ? badges[badge] : 0;
        return (
          <NavLink key={to} to={to} end={end} title={rail ? label : undefined} aria-label={count ? `${label} (${count} waiting)` : undefined}
            className={({ isActive }) => cx('relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-rose-50 text-rose-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900')}>
            <Icon size={18} className="shrink-0" aria-hidden />
            <span className={cx('whitespace-nowrap', rail && 'opacity-0 transition-opacity duration-150 group-hover/side:opacity-100 group-has-[:focus-visible]/side:opacity-100')}>{label}</span>
            {count > 0 && (
              <span aria-hidden className={cx('min-w-[1.25rem] rounded-full bg-rose-700 px-1.5 text-center text-[11px] font-bold leading-5 text-white', rail ? 'absolute left-6 top-1' : 'ml-auto')}>{count > 99 ? '99+' : count}</span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
