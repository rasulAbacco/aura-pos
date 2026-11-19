/**
 * Screens:
 *   /                 Explore salons (search, salon type, city, nearest)  public
 *   /shop             Products from all salons, pick up at the shop       public
 *   /s/:slug          A salon: photos, services, products, info            public
 *   /s/:slug/p/:id    A product: photos, price, details, stock per branch  public
 *   /s/:slug/book     Book services: branch → stylist → day & time → confirm   sign-in
 *   /cart             Product cart → place pickup order                   sign-in to place
 *   /bookings         My bookings (upcoming / past), cancel                sign-in
 *   /orders           My product orders, cancel                            sign-in
 *   /profile          Name, email…, my salons (visits, wallet, bills), sign out   sign-in
 *   /login, /welcome  Mobile number → SMS code → your name
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { TabBar } from './components/TabBar.jsx';
import { TopNav, Footer } from './components/TopNav.jsx';
import { Spinner } from './components/ui.jsx';
import HomePage from './pages/HomePage.jsx';

const SalonPage = lazy(() => import('./pages/SalonPage.jsx'));
const ShopPage = lazy(() => import('./pages/ShopPage.jsx'));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'));
const BookPage = lazy(() => import('./pages/BookPage.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const BookingsPage = lazy(() => import('./pages/BookingsPage.jsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const WelcomePage = lazy(() => import('./pages/WelcomePage.jsx'));

/** Sign-in needed: goes to /login and comes back here afterwards. New accounts add their name first. */
function RequireAuth({ children }) {
  const { status, account } = useAuth();
  const loc = useLocation();
  const next = encodeURIComponent(loc.pathname + loc.search);
  if (status === 'loading') return <Spinner />;
  if (status !== 'authed') return <Navigate to={`/login?next=${next}`} replace />;
  if (!account?.name) return <Navigate to={`/welcome?next=${next}`} replace />;
  return children;
}

// Website pages: top navigation on tablets/computers, footer; phones get the bottom tab bar on main tabs.
const site = (el, tabs = false) => <><TopNav />{el}<Footer />{tabs && <TabBar />}</>;
const withTabs = (el) => site(el, true);

export function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={withTabs(<HomePage />)} />
        <Route path="/shop" element={withTabs(<ShopPage />)} />
        <Route path="/s/:slug" element={site(<SalonPage />)} />
        <Route path="/s/:slug/p/:productId" element={site(<ProductPage />)} />
        <Route path="/s/:slug/book" element={site(<RequireAuth><BookPage /></RequireAuth>)} />
        <Route path="/cart" element={site(<CartPage />)} />
        <Route path="/bookings" element={withTabs(<RequireAuth><BookingsPage /></RequireAuth>)} />
        <Route path="/orders" element={withTabs(<RequireAuth><OrdersPage /></RequireAuth>)} />
        <Route path="/profile" element={withTabs(<RequireAuth><ProfilePage /></RequireAuth>)} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
