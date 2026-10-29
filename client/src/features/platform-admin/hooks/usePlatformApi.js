import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../../../lib/api.js';
import { platformApi } from '../utils/platformApi.js';

/** Same contract as the shared useApi hook, but against the platform client. */
export function usePlatformApi(url) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try { const r = await platformApi.get(url); setState({ data: r.data.data, meta: r.data.meta ?? null, loading: false, error: null }); }
    catch (e) { setState({ data: null, meta: null, loading: false, error: errorMessage(e) }); }
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
