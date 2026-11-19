import { Link, NavLink } from 'react-router-dom';
import { LuShoppingBag, LuUser, LuMapPin, LuLoaderCircle } from 'react-icons/lu';
import { useAuth } from '../lib/auth.jsx';
import { useCart } from '../lib/cart.jsx';
import { useLocation2 } from '../lib/location.jsx';
import { cx } from './ui.jsx';
import logo from '../assets/logo-full.png';

const LINKS = [['/', 'Salons', true], ['/shop', 'Shop'], ['/bookings', 'My bookings'], ['/orders', 'My orders']];

/** Website navigation for tablets and computers (phones use the bottom tab bar). */
export function TopNav() {
  const { account } = useAuth();
  const { count } = useCart();
  const loc = useLocation2();
  return (
    <div className="sticky top-0 z-40 hidden border-b border-blush bg-white/95 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link to="/" aria-label="Salora Glam home"><img src={logo} alt="Salora Glam" className="h-9 w-auto" /></Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {LINKS.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('rounded-full px-3.5 py-2 text-sm font-semibold transition', isActive ? 'bg-petal text-mauve' : 'text-stone-600 hover:text-ink')}>{label}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={loc.request} className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-stone-600 hover:bg-petal lg:flex" title="Use my current location">
            {loc.status === 'locating' ? <LuLoaderCircle className="animate-spin" aria-hidden /> : <LuMapPin aria-hidden className={loc.pos ? 'text-mauve' : ''} />}
            {loc.pos ? 'Near you' : 'Use my location'}
          </button>
          <Link to="/cart" className="relative rounded-full p-2.5 text-ink hover:bg-petal" aria-label={`Cart${count ? `, ${count} items` : ''}`}>
            <LuShoppingBag size={20} aria-hidden />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-mauve px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white">{count}</span>}
          </Link>
          {account
            ? <Link to="/profile" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold hover:bg-petal"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-mauve text-xs text-white"><LuUser aria-hidden /></span>{account.name?.split(' ')[0] ?? 'Profile'}</Link>
            : <Link to="/login" className="rounded-full bg-mauve px-4 py-2 text-sm font-semibold text-white hover:bg-mauve-deep">Sign in</Link>}
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 hidden border-t border-blush bg-white md:block">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-stone-500">
        <img src={logo} alt="Salora Glam" className="h-7 w-auto opacity-80" />
        <p>Book salon services and pick up beauty products at the shop. Pay at the salon.</p>
      </div>
    </footer>
  );
}
