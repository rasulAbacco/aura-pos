/**
 * Who is signed in. status: loading | authed | anon.
 * Browsing salons works without signing in; booking, ordering and "my" pages need an account.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshSession, setAccessToken, setSignedOutHandler, signOutOnServer, isOffline } from './api.js';
import { isNative, getRefreshToken } from './native.js';

const Ctx = createContext(null);
const SAVED = 'sg.customer.account';
const readSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED) ?? 'null'); } catch { return null; } };
const save = (a) => { try { if (a) localStorage.setItem(SAVED, JSON.stringify(a)); else localStorage.removeItem(SAVED); } catch { /* private mode */ } };

export function AuthProvider({ children }) {
  const [account, setAccountState] = useState(null);
  const [status, setStatus] = useState('loading');
  const setAccount = useCallback((a) => { setAccountState(a); save(a); }, []);
  const signedOut = useCallback(() => { setAccessToken(null); setAccount(null); setStatus('anon'); }, [setAccount]);

  useEffect(() => {
    setSignedOutHandler(signedOut);
    (async () => {
      // The phone app opens at once with the saved profile while the session is restored.
      const saved = readSaved();
      if (saved && (!isNative || (await getRefreshToken()))) { setAccountState(saved); setStatus('authed'); }
      try {
        const r = await refreshSession();
        setAccount(r.account); setStatus('authed');
      } catch (e) {
        if (isOffline(e) && saved) return; // no signal: keep the saved profile, requests retry later
        signedOut();
      }
    })();
  }, [setAccount, signedOut]);

  const requestCode = useCallback(async (phone) => (await api.post('/auth/otp', { phone })).data.data, []);
  const verifyCode = useCallback(async (phone, code) => {
    const r = await api.post('/auth/verify', { phone, code });
    setAccessToken(r.data.data.accessToken);
    setAccount(r.data.data.account); setStatus('authed');
    return r.data.data;
  }, [setAccount]);
  const updateProfile = useCallback(async (patch) => {
    const r = await api.patch('/me', patch);
    setAccount(r.data.data);
    return r.data.data;
  }, [setAccount]);
  const signOut = useCallback(async () => { await signOutOnServer(); signedOut(); }, [signedOut]);

  const value = useMemo(() => ({ account, status, requestCode, verifyCode, updateProfile, signOut }), [account, status, requestCode, verifyCode, updateProfile, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
