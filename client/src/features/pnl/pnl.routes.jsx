/** pnl pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const PnlPage = lazy(() => import('./PnlPage.jsx'));

export const pnlRoutes = <Route path="pnl" element={<PnlPage />} />;
