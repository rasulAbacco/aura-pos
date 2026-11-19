/**
 * Customer-app counts (booking requests waiting, open orders) for the current branch.
 * One shared request per minute for the whole app: the sidebar badge and the dashboard card both read it,
 * and the App requests page asks for a refresh after it confirms or declines something.
 */
import { useEffect, useState } from 'react';
import { api } from './api.js';

let current = null;
let timer = null;
let inflight = null;
const listeners = new Set();

async function load() {
  if (inflight) return inflight;
  const branch = sessionStorage.getItem('aura.branch');
  inflight = api.get(`/online/summary${branch ? `?branchId=${branch}` : ''}`)
    .then((r) => { current = r.data.data; listeners.forEach((fn) => fn(current)); })
    .catch(() => {}) // no permission, offline, expired plan: just show no badge
    .finally(() => { inflight = null; });
  return inflight;
}

export const refreshOnlineSummary = () => load();

/** Pass enabled=false when the user can't see either list (no request is made). */
export function useOnlineSummary(enabled = true) {
  const [data, setData] = useState(current);
  useEffect(() => {
    if (!enabled) return undefined;
    listeners.add(setData);
    if (!timer) { load(); timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60000); }
    return () => {
      listeners.delete(setData);
      if (!listeners.size) { clearInterval(timer); timer = null; }
    };
  }, [enabled]);
  return enabled ? data : null;
}

/** Number shown on the sidebar badge: requests waiting for an answer + new orders. */
export const attentionCount = (s) => (s ? s.bookings.pending + s.orders.new : 0);
