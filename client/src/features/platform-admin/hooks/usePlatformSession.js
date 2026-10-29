import { useCallback, useEffect, useState } from 'react';
import { platformLogin, platformLogout, platformRefresh } from '../utils/platformApi.js';

/** 'checking' → tries the refresh cookie once; then 'in' or 'out'. */
export function usePlatformSession() {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    platformRefresh().then(() => setStatus('in')).catch(() => setStatus('out'));
    const out = () => setStatus('out');
    window.addEventListener('aura:platform-logout', out);
    return () => { window.removeEventListener('aura:platform-logout', out); };
  }, []);
  const login = useCallback(async (email, password) => { await platformLogin(email, password); setStatus('in'); }, []);
  const logout = useCallback(async () => { await platformLogout(); setStatus('out'); }, []);
  return { status, login, logout };
}
