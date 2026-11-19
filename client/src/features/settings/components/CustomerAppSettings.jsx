import { useState } from 'react';
import { LuLocateFixed, LuMapPin, LuExternalLink } from 'react-icons/lu';
import { PhotoManager } from '../../../components/media/PhotoManager.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { Field } from '../../../components/forms';
import { useToast } from '../../../contexts/ToastContext.jsx';

export const SALON_CATEGORIES = [
  ['UNISEX_SALON', 'Unisex salon'],
  ['WOMENS_PARLOUR', "Women's beauty parlour"],
  ['MENS_SALON', "Men's salon"],
  ['SPA', 'Spa'],
  ['SPA_SALON', 'Spa + salon'],
];

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3 hover:bg-stone-50">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-rose-700" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span><span className="block text-sm font-semibold text-stone-800">{label}</span>{hint && <span className="block text-xs text-stone-500">{hint}</span>}</span>
    </label>
  );
}

/** Salon-wide: is the salon shown in the Salora Glam customer app, its category and a short description. */
export function SalonAppSettings({ tenant, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ appListed: tenant.appListed ?? true, category: tenant.category ?? '', about: tenant.about ?? '' });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/settings/profile', { appListed: f.appListed, category: f.category || null, about: f.about.trim() || null });
      toast('Customer app settings saved'); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      <Toggle checked={f.appListed} onChange={(v) => setF({ ...f, appListed: v })} label="Show my salon in the Salora Glam app"
        hint="Customers can find you, see your price list and request bookings or order products. Your salon is hidden automatically while your plan is not active." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field as="select" label="Salon type" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} hint="Customers filter salons by this in the app.">
          <option value="">Not set</option>
          {SALON_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Field>
        <div className="text-xs text-stone-500 sm:pt-6">Prices, services and products come from your price list. Only active items are shown.</div>
      </div>
      <PhotoManager max={6} uploadUrl="/settings/photos" orderUrl="/settings/photos/order" initial={tenant.photos ?? []} label="Salon photos (shown at the top of your page in the app)" />
      <Field as="textarea" label="About your salon (shown in the app)" value={f.about} maxLength={600} onChange={(e) => setF({ ...f, about: e.target.value })} placeholder="What you're known for, parking, languages spoken…" />
      <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save customer app settings'}</Button>
    </div>
  );
}

/** Per branch: city (for search), and whether this branch takes app bookings and product orders. */
export function BranchAppSettings({ branch, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ city: branch.city ?? '', onlineBooking: branch.onlineBooking ?? true, onlineOrders: branch.onlineOrders ?? true, latitude: branch.latitude ?? '', longitude: branch.longitude ?? '' });
  const [locating, setLocating] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) { toast('This device can’t share its location. Type the position instead.', 'error'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((x) => ({ ...x, latitude: p.coords.latitude.toFixed(6), longitude: p.coords.longitude.toFixed(6) })); setLocating(false); toast(`Location found (accurate to about ${Math.round(p.coords.accuracy)} m). Check it on the map, then save.`); },
      (e) => { setLocating(false); toast(e.code === 1 ? 'Location permission was denied. Allow location for this app/site in your phone or browser settings.' : 'Could not get your location. Try again near a window or type it in.', 'error'); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };
  const hasPos = f.latitude !== '' && f.longitude !== '' && !Number.isNaN(Number(f.latitude)) && !Number.isNaN(Number(f.longitude));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/settings/branches/${branch.id}`, {
        city: f.city.trim() || null, onlineBooking: f.onlineBooking, onlineOrders: f.onlineOrders,
        latitude: f.latitude === '' ? null : Number(f.latitude), longitude: f.longitude === '' ? null : Number(f.longitude),
      });
      toast(`${branch.name}: customer app settings saved`); onSaved();
    } catch (e) { toast(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-3">
      <Field label="City / area (customers search by this)" value={f.city} maxLength={60} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Bengaluru" />
      <div className="rounded-lg border border-stone-200 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800"><LuMapPin aria-hidden className="text-rose-700" />Shop location on the map</p>
        <p className="mb-2 text-xs text-stone-500">Customers see how far you are and get directions. Stand inside the shop and tap “Use my current location”, or copy the position from Google Maps (long-press the shop → the numbers at the top).</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Latitude" inputMode="decimal" value={f.latitude} onChange={(e) => setF({ ...f, latitude: e.target.value })} placeholder="12.971600" />
          <Field label="Longitude" inputMode="decimal" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} placeholder="77.641200" />
          <Button onClick={locate} disabled={locating}><LuLocateFixed aria-hidden />{locating ? 'Finding…' : 'Use my current location'}</Button>
        </div>
        {hasPos && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${f.latitude},${f.longitude}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline">
            Check this position on Google Maps <LuExternalLink aria-hidden />
          </a>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle checked={f.onlineBooking} onChange={(v) => setF({ ...f, onlineBooking: v })} label="Take booking requests"
          hint="Customers pick services, a stylist (or any) and a free time. You confirm or decline under App requests." />
        <Toggle checked={f.onlineOrders} onChange={(v) => setF({ ...f, onlineOrders: v })} label="Take product orders for pickup"
          hint="Customers order products in stock here and pay when they collect. Units in open orders are held." />
      </div>
      <p className="text-xs text-stone-500">Free times follow this branch's opening hours and each stylist's existing bookings.</p>
      <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
    </div>
  );
}
