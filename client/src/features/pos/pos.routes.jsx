/** pos pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const PosPage = lazy(() => import('./PosPage.jsx'));

export const posRoutes = <Route path="pos" element={<PosPage />} />;
