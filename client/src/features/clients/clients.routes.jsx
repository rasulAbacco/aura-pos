/** clients pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const ClientsPage = lazy(() => import('./ClientsPage.jsx'));

export const clientsRoutes = <Route path="clients" element={<ClientsPage />} />;
