import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';

/**
 * GET a URL with loading/error state. Pass null to skip. Returns { data, meta, loading, error, reload }.
 * State remembers which URL it belongs to, so on the render right after the URL changes
 * (e.g. a tab switching from null to a real URL) callers see loading=true and data=null — never stale data.
 */
export function useApi(url, deps = []) {
  const [state, setState] = useState({ url: undefined, data: null, meta: null, loading: !!url, error: null });
  const load = useCallback(async () => {
    if (!url) { setState({ url, data: null, meta: null, loading: false, error: null }); return; }
    setState((s) => ({ ...s, url, loading: true, error: null }));
    try {
      const r = await api.get(url);
      setState({ url, data: r.data.data, meta: r.data.meta ?? null, loading: false, error: null });
    } catch (e) { setState({ url, data: null, meta: null, loading: false, error: errorMessage(e) }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);
  useEffect(() => { load(); }, [load]);
  const stale = state.url !== url;
  return {
    data: stale ? null : state.data,
    meta: stale ? null : state.meta,
    loading: stale ? !!url : state.loading,
    error: stale ? null : state.error,
    reload: load,
  };
}
