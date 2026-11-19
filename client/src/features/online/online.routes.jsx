/** App requests page (customer-app bookings and orders), mounted under /app by app/router.jsx. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const OnlinePage = lazy(() => import('./OnlinePage.jsx'));

export const onlineRoutes = <Route path="online" element={<OnlinePage />} />;
