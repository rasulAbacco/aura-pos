/** /platform — Super Admin area with its own login (not inside the salon app shell). */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const PlatformAdminPage = lazy(() => import('./PlatformAdminPage.jsx'));

export const platformAdminRoutes = <Route path="platform" element={<PlatformAdminPage />} />;
