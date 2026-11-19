/**
 * API client for the customer app (all calls go to /api/v1/customer/...).
 * Access token: in memory only. Refresh: HttpOnly cookie on the web, app storage on the phone.
 * On a 401 the session is refreshed once and the request retried; only a refused refresh signs out.
 */
import axios from 'axios';
import { isNative, getRefreshToken, setRefreshToken } from './native.js';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

let accessToken = null;
let onSignedOut = () => {};
export const setAccessToken = (t) => { accessToken = t; };
export const setSignedOutHandler = (fn) => { onSignedOut = fn; };

export const api = axios.create({
  baseURL: `${API_BASE_URL}/customer`,
  withCredentials: !isNative,
  timeout: 60000, // a sleeping free server can take ~50 s to wake up
  headers: { 'X-Requested-With': 'XMLHttpRequest', ...(isNative ? { 'X-Client-Platform': 'native' } : {}) },
});

export const isOffline = (e) => !!e?.isAxiosError && (!e.response || [502, 503, 504].includes(e.response.status));

export function errorMessage(e) {
  if (isOffline(e)) return 'Can’t reach Salora Glam right now. Check your internet and try again.';
  return e?.response?.data?.error?.message ?? e?.message ?? 'Something went wrong';
}

// Keep the newest refresh token the server sends to the phone app.
api.interceptors.response.use(async (r) => {
  const rt = isNative ? r.data?.data?.refreshToken : undefined;
  if (rt) await setRefreshToken(rt);
  return r;
});
api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`;
  return cfg;
});

let refreshing = null;
/** Single-flight session refresh. Resolves with { accessToken, account } or throws. */
export function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      const body = isNative ? { refreshToken: await getRefreshToken() } : {};
      if (isNative && !body.refreshToken) throw Object.assign(new Error('No saved session'), { noSession: true });
      const r = await api.post('/auth/refresh', body, { _noRetry: true });
      accessToken = r.data.data.accessToken;
      return r.data.data;
    })().finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(undefined, async (err) => {
  const cfg = err.config;
  if (err.response?.status === 401 && cfg && !cfg._retried && !cfg._noRetry && !cfg.url.startsWith('/auth/')) {
    cfg._retried = true;
    try {
      await refreshSession();
      return api(cfg);
    } catch (e) {
      if (!isOffline(e)) { accessToken = null; await setRefreshToken(null); onSignedOut(); }
      throw err;
    }
  }
  // GETs that failed because the server was unreachable: try twice more.
  if (isOffline(err) && cfg && cfg.method === 'get' && (cfg._tries ?? 0) < 2) {
    cfg._tries = (cfg._tries ?? 0) + 1;
    await new Promise((r) => setTimeout(r, 1500 * cfg._tries));
    return api(cfg);
  }
  throw err;
});

export async function signOutOnServer() {
  try {
    const body = isNative ? { refreshToken: await getRefreshToken() } : {};
    await api.post('/auth/logout', body, { _noRetry: true });
  } catch { /* offline: the token is forgotten locally anyway */ }
  accessToken = null;
  await setRefreshToken(null);
}

/** A unique id per booking/order attempt, so a double tap or a lost response books only once. */
export const newRequestId = () => (crypto.randomUUID ? crypto.randomUUID()
  : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
