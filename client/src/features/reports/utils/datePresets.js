import { todayISO } from '../../../utils/format.js';

const shift = (iso, days) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };

/** Date ranges in the salon's calendar (India time). Each returns { from, to } inclusive. */
export function presetRange(key) {
  const today = todayISO();
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const monthStart = `${today.slice(0, 7)}-01`;
  switch (key) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const y = shift(today, -1); return { from: y, to: y }; }
    case 'week': return { from: shift(today, -dow), to: today };
    case 'lastMonth': { const end = shift(monthStart, -1); return { from: `${end.slice(0, 7)}-01`, to: end }; }
    case 'month': default: return { from: monthStart, to: today };
  }
}

export const PRESETS = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['month', 'This month'], ['lastMonth', 'Last month']];
