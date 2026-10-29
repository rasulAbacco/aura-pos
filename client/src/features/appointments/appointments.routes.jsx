/** appointments pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const AppointmentsPage = lazy(() => import('./AppointmentsPage.jsx'));

export const appointmentsRoutes = <Route path="appointments" element={<AppointmentsPage />} />;
