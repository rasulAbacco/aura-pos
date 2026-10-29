import { cx } from '../../../utils/cx.js';
import { Field } from '../../../components/forms';
import { PRESETS, presetRange } from '../utils/datePresets.js';

export function DateRangeBar({ range, onChange }) {
  const active = PRESETS.find(([k]) => { const r = presetRange(k); return r.from === range.from && r.to === range.to; })?.[0];
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => onChange(presetRange(k))}
            className={cx('rounded-full px-3 py-1.5 text-sm font-semibold', active === k ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200')}>{l}</button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Field label="From" type="date" value={range.from} max={range.to} onChange={(e) => onChange({ ...range, from: e.target.value })} />
        <Field label="To" type="date" value={range.to} min={range.from} onChange={(e) => onChange({ ...range, to: e.target.value })} />
      </div>
    </div>
  );
}
