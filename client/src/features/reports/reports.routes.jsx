/** reports pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const ReportsPage = lazy(() => import('./ReportsPage.jsx'));

export const reportsRoutes = <Route path="reports" element={<ReportsPage />} />;
