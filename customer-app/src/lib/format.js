const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
export const rupees = (v) => inr.format(Number(v ?? 0));
export const rupees2 = (v) => inr2.format(Number(v ?? 0));
const TZ = 'Asia/Kolkata';
export const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
export const time = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
export const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
export function dayLabel(d) {
  const k = dayKey(d);
  if (k === dayKey(new Date())) return 'Today';
  if (k === dayKey(Date.now() + 86400000)) return 'Tomorrow';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
}
export const when = (d) => `${dayLabel(d)}, ${time(d)}`;
export const minutes = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
export const initials = (s = '') => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
