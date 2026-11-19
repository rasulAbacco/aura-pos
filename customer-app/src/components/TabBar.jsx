import { NavLink } from 'react-router-dom';
import { LuStore, LuCalendarDays, LuShoppingBag, LuUser, LuSparkles } from 'react-icons/lu';
import { useCart } from '../lib/cart.jsx';
import { cx } from './ui.jsx';

const TABS = [
  { to: '/', label: 'Salons', icon: LuStore, end: true },
  { to: '/shop', label: 'Shop', icon: LuSparkles },
  { to: '/bookings', label: 'Bookings', icon: LuCalendarDays },
  { to: '/orders', label: 'Orders', icon: LuShoppingBag, cart: true },
  { to: '/profile', label: 'Profile', icon: LuUser },
];

/** Bottom navigation on phones (tablets and computers use the top navigation). */
export function TabBar() {
  const { count } = useCart();
  return (
    <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-blush bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {TABS.map(({ to, label, icon: Icon, end, cart }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 pb-1 pt-2.5 text-[11px] font-semibold', isActive ? 'text-mauve' : 'text-stone-500')}>
            <Icon size={22} aria-hidden />
            {label}
            {cart && count > 0 && <span className="absolute left-1/2 top-1 ml-2 min-w-[1.1rem] rounded-full bg-mauve px-1 text-center text-[10px] leading-[1.1rem] text-white" aria-label={`${count} in cart`}>{count}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
