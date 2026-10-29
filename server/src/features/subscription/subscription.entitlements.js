/**
 * Subscription entitlement evaluation. Pure function, evaluated on EVERY request with
 * server time — never cached across requests, never dependent on a cron having run.
 *
 * Effective states:
 *   SUSPENDED  tenant suspended by platform admin — overrides everything, incl. payment
 *   NONE       no subscription yet — onboarding/billing only
 *   TRIAL      trial period running
 *   ACTIVE     paid period running (also CANCELLED with cancelAtPeriodEnd before period end)
 *   GRACE      paid period ended ≤ graceDays ago — still writable, with a warning
 *   EXPIRED    read-only; billing, exports and renewal remain available
 *
 * Access rules (docs/02-architecture.md §5):
 *   writable : TRIAL, ACTIVE, GRACE
 *   readable : everything except SUSPENDED (SUSPENDED → only billing + export routes)
 */
const DAY = 24 * 60 * 60 * 1000;
export const REMINDER_DAYS = 7;

export function evaluateEntitlement({ tenant, subscription, plan, now = new Date() }) {
  const base = { features: new Set(plan?.features ?? []), limits: { maxStaff: plan?.maxStaff ?? 0, maxBranches: plan?.maxBranches ?? 0 }, planCode: plan?.code ?? null };

  if (!tenant || tenant.status === 'CLOSED') {
    return { ...base, state: 'CLOSED', readable: false, writable: false, reason: 'Account closed' };
  }
  if (tenant.status === 'SUSPENDED') {
    return { ...base, state: 'SUSPENDED', readable: false, writable: false, reason: tenant.suspendedReason || 'Account suspended by platform administrator' };
  }
  if (!subscription) {
    return { ...base, state: 'NONE', readable: true, writable: false, reason: 'Choose a plan to start using the POS' };
  }

  const end = new Date(subscription.currentPeriodEnd).getTime();
  const t = now.getTime();
  const graceDays = plan?.graceDays ?? 0;
  const graceEndsAt = new Date(end + graceDays * DAY);
  const daysLeft = Math.ceil((end - t) / DAY);
  const common = { ...base, periodEnd: new Date(end), graceEndsAt, daysLeft };

  if (subscription.status === 'EXPIRED') {
    return { ...common, state: 'EXPIRED', readable: true, writable: false, reason: 'Subscription expired — renew to resume billing' };
  }

  if (t < end) {
    const state = subscription.status === 'TRIAL' ? 'TRIAL' : 'ACTIVE';
    return {
      ...common, state, readable: true, writable: true,
      renewalReminder: daysLeft <= REMINDER_DAYS,
      cancelling: subscription.status === 'CANCELLED' || subscription.cancelAtPeriodEnd,
      reason: null,
    };
  }

  // Period has ended. Grace applies only to paid subscriptions that were not cancelled.
  const graceEligible = ['ACTIVE', 'PAST_DUE'].includes(subscription.status) && !subscription.cancelAtPeriodEnd;
  if (graceEligible && t < graceEndsAt.getTime()) {
    return { ...common, state: 'GRACE', readable: true, writable: true, reason: `Payment overdue — access will become read-only on ${graceEndsAt.toISOString().slice(0, 10)}` };
  }
  return { ...common, state: 'EXPIRED', readable: true, writable: false, reason: subscription.status === 'TRIAL' ? 'Trial ended — choose a plan to continue' : 'Subscription expired — renew to resume billing' };
}

/** Next period end when a payment for `plan` is applied (renewal extends from the later of now/current end). */
export function nextPeriod({ subscription, plan, now = new Date() }) {
  const months = { MONTHLY: 1, QUARTERLY: 3, ANNUAL: 12 }[plan.interval];
  if (!months) throw new Error(`Unknown interval ${plan.interval}`);
  const currentEnd = subscription ? new Date(subscription.currentPeriodEnd) : null;
  // Early renewal stacks onto the remaining paid time; late renewal starts from now.
  const start = currentEnd && currentEnd > now && subscription.status !== 'TRIAL' ? currentEnd : now;
  return { start, end: addMonthsClamped(start, months) };
}

/** Add calendar months, clamping to month end (31 Jan + 1 month = 28/29 Feb, not 3 Mar). */
export function addMonthsClamped(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}
