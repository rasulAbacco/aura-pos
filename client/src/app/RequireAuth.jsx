import { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const Loading = () => <div className="flex h-full items-center justify-center text-sm text-stone-500" aria-busy="true">Loading…</div>;

/** Sends signed-out visitors to /login. (UI convenience only; the API checks every request.) */
export function RequireAuth({ children }) {
  const { status } = useAuth();
  const loc = useLocation();
  if (status === 'loading') return <Loading />;
  if (status !== 'authed') return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
