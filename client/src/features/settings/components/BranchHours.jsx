/**
 * Opening hours of one branch: open/closed per day, opening and closing time, an optional break.
 * App bookings are only offered inside these hours (and the app shows them on the salon page).
 */
import { useState } from 'react';
import { LuCopy, LuPlus, LuX } from 'react-icons/lu';
import { api, errorMessage } from '../../../lib/api.js';
import { Button } from '../../../components/ui';
import { useToast } from '../../../contexts/ToastContext.jsx';
import { cx } from '../../../utils/cx.js';

const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
const DEFAULT = { mon: [['10:00', '20:00']], tue: [['10:00', '20:00']], wed: [['10:00', '20:00']], thu: [['10:00', '20:00']], fri: [['10:00', '20:00']], sat: [['10:00', '20:00']], sun: [['10:00', '18:00']] };
const timeInput = 'rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm num focus:outline-none focus:ring-2 focus:ring-rose-600/40';

function problems(hours) {
  for (const [k, label] of DAYS) {
    const list = hours[k] ?? [];
    for (const [o, c] of list) if (!(o < c)) return `${label}: opening time must be before closing time`;
    if (list.length === 2 && !(list[0][1] <= list[1][0])) return `${label}: the break must come after the first session ends`;
  }
  return null;
}

export function BranchHours({ branch, onSaved }) {
  const toast = useToast();
  const [hours, setHours] = useState(() => structuredClone(branch.businessHours ?? DEFAULT));
  const [saving, setSaving] = useState(false);
  const setDay = (k, v) => setHours((h) => ({ ...h, [k]: v }));
  const error = problems(hours);

  const save = async () => {
    setSaving(true);
    try { await api.patch(`/settings/branches/${branch.id}`, { businessHours: hours }); toast(`${branch.name}: opening hours saved`); onSaved(); }
    catch (e) { toast(errorMessage(e), 'error'); } finally { setSaving(false); }
  };
  const copyMonday = () => setHours((h) => Object.fromEntries(DAYS.map(([k]) => [k, k === 'sun' ? h.sun : structuredClone(h.mon ?? [])])));

  return (
    <div>
      <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200">
        {DAYS.map(([k, label]) => {
          const list = hours[k] ?? [];
          const open = list.length > 0;
          return (
            <li key={k} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
              <label className="flex w-36 items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-rose-700" checked={open} onChange={(e) => setDay(k, e.target.checked ? [['10:00', '20:00']] : [])} />
                {label}
              </label>
              {!open ? <span className="text-sm text-stone-400">Closed</span> : (
                <div className="flex flex-wrap items-center gap-2">
                  {list.map(([o, c], i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      {i === 1 && <span className="text-xs text-stone-500">and</span>}
                      <input type="time" aria-label={`${label} opens`} value={o} step={900} className={timeInput} onChange={(e) => setDay(k, list.map((p, j) => (j === i ? [e.target.value, p[1]] : p)))} />
                      <span className="text-stone-400">–</span>
                      <input type="time" aria-label={`${label} closes`} value={c} step={900} className={timeInput} onChange={(e) => setDay(k, list.map((p, j) => (j === i ? [p[0], e.target.value] : p)))} />
                      {i === 1 && <button type="button" aria-label={`Remove ${label} break`} onClick={() => setDay(k, [[list[0][0], list[1][1]]])} className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-rose-700"><LuX /></button>}
                    </span>
                  ))}
                  {list.length === 1 && (
                    <button type="button" onClick={() => { const [o, c] = list[0]; const mid = o < '13:00' && c > '14:00' ? ['13:00', '14:00'] : [o, c]; setDay(k, [[o, mid[0]], [mid[1], c]]); }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"><LuPlus aria-hidden /> Add break</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={save} disabled={saving || !!error}>{saving ? 'Saving…' : 'Save opening hours'}</Button>
        <Button variant="ghost" onClick={copyMonday}><LuCopy aria-hidden /> Copy Monday to Tue–Sat</Button>
        <span className={cx('text-xs text-stone-500')}>Customers can only book inside these hours. Times are in your salon's time zone.</span>
      </div>
    </div>
  );
}
