/** staff pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const StaffPage = lazy(() => import('./StaffPage.jsx'));

export const staffRoutes = <Route path="staff" element={<StaffPage />} />;
