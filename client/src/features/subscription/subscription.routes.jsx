/** subscription pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const SubscriptionPage = lazy(() => import('./SubscriptionPage.jsx'));

export const subscriptionRoutes = <Route path="subscription" element={<SubscriptionPage />} />;
