/** expenses pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const ExpensesPage = lazy(() => import('./ExpensesPage.jsx'));

export const expensesRoutes = <Route path="expenses" element={<ExpensesPage />} />;
