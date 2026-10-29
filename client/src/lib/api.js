/**
 * API client. The access token lives only in memory (never localStorage — XSS can't
 * lift a persisted token). The refresh token is an HttpOnly cookie the JS can't read.
 * On 401 we refresh once (single-flight) and retry; failure sends the user to login.
 */
import axios from 'axios';

let accessToken = null;
let onSessionLost = () => {};
export const setAccessToken = (t) => { accessToken = t; };
export const setSessionLostHandler = (fn) => { onSessionLost = fn; };

/** e.g. http://localhost:4000/api/v1 (client/.env). Defaults to same-origin /api/v1 (single-port production). */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } });

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  const branch = sessionStorage.getItem('aura.branch');
  if (branch && !cfg.headers['X-Branch-Id']) cfg.headers['X-Branch-Id'] = branch;
  return cfg;
});

let refreshing = null;
export function refreshSession() {
  refreshing ??= axios.post(`${API_BASE_URL}/auth/refresh`, null, { withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    .then((r) => { setAccessToken(r.data.data.accessToken); return r.data.data.accessToken; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.response.use((r) => r, async (err) => {
  const cfg = err.config;
  const code = err.response?.data?.error?.code;
  if (err.response?.status === 401 && !cfg._retried && !cfg.url.startsWith('/auth/')) {
    cfg._retried = true;
    try { await refreshSession(); return api(cfg); } catch { onSessionLost(); }
  }
  if (err.response?.status === 402 || err.response?.status === 423) {
    window.dispatchEvent(new CustomEvent('aura:entitlement', { detail: code }));
  }
  return Promise.reject(err);
});

/** Human message for any API error, with field details when present. */
export function errorMessage(err) {
  const e = err?.response?.data?.error;
  if (!e) return err?.message === 'Network Error' ? 'Cannot reach the server. Check your connection.' : 'Something went wrong. Please try again.';
  if (e.details?.length && e.code === 'VALIDATION_FAILED') return e.details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join(' · ');
  return e.message;
}
