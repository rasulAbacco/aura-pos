/** Timezone helpers (no dependency): convert a wall-clock time in an IANA zone to UTC. */
function offsetMinutes(utcDate, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(utcDate).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return (asUtc - utcDate.getTime()) / 60000;
}

/** "2026-10-28", "10:30", "Asia/Kolkata" → Date (UTC instant). DST-safe via two-pass offset. */
export function zonedToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = offsetMinutes(new Date(guess), timeZone);
  const off2 = offsetMinutes(new Date(guess - off1 * 60000), timeZone);
  return new Date(guess - off2 * 60000);
}

/** Calendar date string (YYYY-MM-DD) of an instant in a zone. */
export function zonedDateString(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function weekdayKey(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export const DEFAULT_HOURS = { mon: [['10:00', '20:00']], tue: [['10:00', '20:00']], wed: [['10:00', '20:00']], thu: [['10:00', '20:00']], fri: [['10:00', '20:00']], sat: [['10:00', '20:00']], sun: [['10:00', '18:00']] };
