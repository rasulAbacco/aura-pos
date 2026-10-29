/** catalog pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const CatalogPage = lazy(() => import('./CatalogPage.jsx'));

export const catalogRoutes = <Route path="catalog" element={<CatalogPage />} />;
