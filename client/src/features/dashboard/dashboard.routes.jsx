/** dashboard pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const DashboardPage = lazy(() => import('./DashboardPage.jsx'));

export const dashboardRoutes = <Route index element={<DashboardPage />} />;
