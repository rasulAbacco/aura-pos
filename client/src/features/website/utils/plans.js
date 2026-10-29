/** Helpers for showing server plans on the website. Prices/limits always come from the API. */
export const INTERVAL_UNIT = { MONTHLY: 'month', QUARTERLY: 'quarter', ANNUAL: 'year' };
export const displayName = (p) => p.name.replace(/\s*\((annual|yearly|monthly)\)\s*$/i, '');

/** Largest real saving of an annual plan versus 12 × its monthly twin (same display name), as a whole %. */
export function annualSaving(plans) {
  let best = 0;
  for (const a of plans.filter((p) => p.interval === 'ANNUAL')) {
    const m = plans.find((p) => p.interval === 'MONTHLY' && displayName(p) === displayName(a));
    if (m && Number(m.price) > 0) best = Math.max(best, Math.round((1 - Number(a.price) / (Number(m.price) * 12)) * 100));
  }
  return best > 0 ? best : null;
}
