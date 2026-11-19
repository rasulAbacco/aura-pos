/**
 * Booking-request alert for everyone who can answer app requests (front desk, stylists, managers…).
 * Every 20 s it asks the server for new requests (GET /online/pulse). On a new booking request or order:
 *   - plays a chime (after the first tap on the page — browser rule), vibrates phones,
 *   - shows a card that stays until someone opens or dismisses it,
 *   - shows a desktop notification if allowed, and puts the count in the browser tab title.
 * While requests are still waiting it plays a softer reminder every 3 minutes (can be switched off).
 * Note: a phone app that is closed or in the background can't ring — that needs push notifications.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuBellRing, LuX, LuVolume2 } from 'react-icons/lu';
import { api } from '../../../lib/api.js';
import { refreshOnlineSummary } from '../../../lib/onlineSummary.js';
import { alertPrefs, audioReady, playChime, unlockAudio } from '../../../lib/alertSound.js';

const POLL_MS = 20000;
const REMIND_MS = 3 * 60000;
const fmt = (d) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function RequestAlerts({ enabled }) {
  const [alert, setAlert] = useState(null);       // { kind, text }
  const [locked, setLocked] = useState(false);    // sound wanted but the page hasn't been tapped yet
  const seen = useRef(null);                       // newest request time already announced
  const lastRing = useRef(0);
  const baseTitle = useRef(document.title.replace(/^\(\d+\) /, ''));
  const { pathname } = useLocation();

  // Unlock sound on the first tap/click/key anywhere.
  useEffect(() => {
    if (!enabled) return undefined;
    const go = () => unlockAudio().then((ok) => { if (ok) setLocked(false); });
    window.addEventListener('pointerdown', go, { passive: true });
    window.addEventListener('keydown', go);
    return () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    let stop = false;
    const tick = async () => {
      let p;
      try {
        const branch = sessionStorage.getItem('aura.branch');
        p = (await api.get(`/online/pulse${branch ? `?branchId=${branch}` : ''}`)).data.data;
      } catch { return; } // offline / no permission / plan expired: stay quiet
      if (stop) return;
      const waiting = p.pendingBookings + p.newOrders;
      document.title = waiting ? `(${waiting}) ${baseTitle.current}` : baseTitle.current;
      const newest = [p.latestBooking?.at, p.latestOrder?.at].filter(Boolean).sort().at(-1) ?? null;
      if (seen.current === null) { seen.current = newest ?? ''; return; } // first look: don't ring for old requests
      if (newest && newest > seen.current) {
        seen.current = newest;
        const isBooking = p.latestBooking?.at === newest;
        const text = isBooking
          ? `${p.latestBooking.customer} requested ${p.latestBooking.service} for ${fmt(p.latestBooking.startsAt)}`
          : `${p.latestOrder.customer} placed order ${p.latestOrder.number} for pickup`;
        setAlert({ kind: isBooking ? 'booking' : 'order', text, waiting });
        refreshOnlineSummary();
        lastRing.current = Date.now();
        if (!playChime() && alertPrefs().sound) setLocked(!audioReady());
        if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
          try { new Notification(isBooking ? 'New booking request' : 'New product order', { body: text, tag: 'aura-request', icon: '/favicon.png' }); } catch { /* not allowed here */ }
        }
      } else if (waiting > 0 && alertPrefs().remind && Date.now() - lastRing.current > REMIND_MS) {
        lastRing.current = Date.now();
        playChime({ reminder: true });
      }
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { stop = true; clearInterval(t); document.title = baseTitle.current; };
  }, [enabled]);

  // Opening App requests counts as seeing the alert.
  useEffect(() => { if (pathname.startsWith('/app/online')) setAlert(null); }, [pathname]);

  if (!enabled || (!alert && !locked)) return null;
  return (
    <div className="no-print fixed right-4 top-20 z-[55] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {alert && (
        <div role="alert" className="animate-[pulse_1s_ease-in-out_2] overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl">
          <div className="flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-700 text-white"><LuBellRing aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-stone-900">{alert.kind === 'booking' ? 'New booking request' : 'New product order'}</p>
              <p className="text-sm text-stone-600">{alert.text}</p>
              {alert.waiting > 1 && <p className="mt-0.5 text-xs text-stone-500">{alert.waiting} requests waiting in total</p>}
            </div>
            <button onClick={() => setAlert(null)} aria-label="Dismiss" className="rounded p-1 text-stone-400 hover:bg-stone-100"><LuX /></button>
          </div>
          <Link to={`/app/online?tab=${alert.kind === 'booking' ? 'bookings' : 'orders'}`} onClick={() => setAlert(null)} className="block bg-rose-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-rose-800">
            {alert.kind === 'booking' ? 'Answer now' : 'View order'}
          </Link>
        </div>
      )}
      {locked && !alert && (
        <button onClick={() => unlockAudio().then((ok) => { if (ok) { setLocked(false); playChime({ reminder: true }); } })}
          className="flex items-center gap-2 self-end rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <LuVolume2 aria-hidden /> Tap to turn on booking alert sound
        </button>
      )}
    </div>
  );
}
