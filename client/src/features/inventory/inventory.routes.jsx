/** inventory pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const InventoryPage = lazy(() => import('./InventoryPage.jsx'));

export const inventoryRoutes = <Route path="inventory" element={<InventoryPage />} />;
