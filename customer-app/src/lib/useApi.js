import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api.js';

const cache = new Map(); // last answer per URL: pages you've seen open instantly, then refresh

/**
 * GET with loading/error state (pass null to skip). Reloads when the app comes back to the front
 * ('sg:refresh') and, with `every` (ms), on a timer while the page is visible.
 */
export function useApi(url, { every } = {}) {
  const [state, setState] = useState(() => ({ data: url ? cache.get(url) ?? null : null, error: null, loading: !!url && !cache.has(url) }));
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!url) return;
    const n = ++seq.current;
    setState((s) => ({ data: cache.get(url) ?? s.data, error: null, loading: !cache.has(url) && s.data == null }));
    try {
      const r = await api.get(url);
      cache.set(url, r.data.data);
      if (n === seq.current) setState({ data: r.data.data, error: null, loading: false });
    } catch (e) {
      if (n === seq.current) setState((s) => ({ ...s, error: errorMessage(e), loading: false }));
    }
  }, [url]);
  useEffect(() => { setState({ data: url ? cache.get(url) ?? null : null, error: null, loading: !!url && !cache.has(url) }); load(); }, [load, url]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener('sg:refresh', h);
    window.addEventListener('focus', h);
    const t = every ? setInterval(() => { if (document.visibilityState === 'visible') load(); }, every) : null;
    return () => { window.removeEventListener('sg:refresh', h); window.removeEventListener('focus', h); if (t) clearInterval(t); };
  }, [load, every]);
  return { ...state, reload: load };
}

export const forgetCached = (prefix) => { for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k); };
