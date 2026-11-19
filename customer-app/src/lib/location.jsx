/**
 * The customer's current location (only when they tap "Use my location"), kept on this device so
 * distances stay shown on the next visit. Used to show "2.4 km away" and sort salons/products by distance.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const KEY = 'sg.customer.location';
const Ctx = createContext(null);
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } };

export function LocationProvider({ children }) {
  const [pos, setPos] = useState(load);
  const [status, setStatus] = useState(pos ? 'ok' : 'idle'); // idle | locating | ok | denied | error | unsupported
  const request = useCallback(() => new Promise((resolve) => {
    if (!navigator.geolocation) { setStatus('unsupported'); resolve(null); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy), at: Date.now() };
        setPos(v); setStatus('ok');
        try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ }
        resolve(v);
      },
      (e) => { setStatus(e.code === 1 ? 'denied' : 'error'); resolve(null); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  }), []);
  const clear = useCallback(() => { setPos(null); setStatus('idle'); try { localStorage.removeItem(KEY); } catch { /* ignore */ } }, []);
  const value = useMemo(() => ({ pos, status, request, clear }), [pos, status, request, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useLocation2 = () => useContext(Ctx);

/** Straight-line distance in km (haversine). */
export function distanceKm(a, b) {
  if (!a || b?.lat == null || b?.lng == null) return null;
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Nearest of several branch points: { km, point } or null. */
export function nearest(pos, points = []) {
  let best = null;
  for (const p of points) { const km = distanceKm(pos, p); if (km != null && (!best || km < best.km)) best = { km, point: p }; }
  return best;
}
export const formatKm = (km) => (km == null ? null : km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);
export const directionsUrl = (b, from) => (b?.lat != null
  ? `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}${from ? `&origin=${from.lat},${from.lng}` : ''}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b?.query ?? '')}`);
