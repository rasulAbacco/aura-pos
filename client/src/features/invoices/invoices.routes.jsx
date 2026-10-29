/** invoices pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const InvoicesPage = lazy(() => import('./InvoicesPage.jsx'));

export const invoicesRoutes = <Route path="invoices" element={<InvoicesPage />} />;
