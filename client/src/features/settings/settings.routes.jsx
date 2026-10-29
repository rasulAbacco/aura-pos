/** settings pages, mounted under /app by app/router.jsx. The page is lazy-loaded. */
import { lazy } from 'react';
import { Route } from 'react-router-dom';

const SettingsPage = lazy(() => import('./SettingsPage.jsx'));

export const settingsRoutes = <Route path="settings" element={<SettingsPage />} />;
