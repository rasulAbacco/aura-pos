import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api.js';
import { annualSaving } from '../utils/plans.js';

/**
 * Plans and prices from the server (single source for every pricing display), plus the
 * monthly/yearly selection. hasAnnual is false when no annual plan is on sale.
 */
export function usePlans() {
  const [plans, setPlans] = useState(null);
  const [interval, setInterval] = useState('MONTHLY');
  useEffect(() => { api.get('/public/plans').then((r) => setPlans(r.data.data)).catch(() => setPlans([])); }, []);
  return useMemo(() => {
    const hasAnnual = !!plans?.some((p) => p.interval === 'ANNUAL') && !!plans?.some((p) => p.interval === 'MONTHLY');
    const shown = plans === null ? null : hasAnnual ? plans.filter((p) => p.interval === interval) : plans;
    return { plans, shown, interval, setInterval, hasAnnual, saving: plans ? annualSaving(plans) : null };
  }, [plans, interval]);
}
