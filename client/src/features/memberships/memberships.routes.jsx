/** memberships pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const MembershipsPage = lazy(() => import('./MembershipsPage.jsx'));

export const membershipsRoutes = <Route path="memberships" element={<MembershipsPage />} />;
