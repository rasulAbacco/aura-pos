/** Client-safe view of the entitlement (drives banners and read-only UI; never authorization). */
export function entitlementSummary(e, subscription) {
  return {
    state: e.state,
    writable: e.writable,
    readable: e.readable,
    reason: e.reason ?? null,
    planCode: e.planCode,
    planName: subscription?.plan?.name ?? null,
    periodEnd: e.periodEnd ?? null,
    graceEndsAt: e.state === 'GRACE' ? e.graceEndsAt : null,
    daysLeft: e.daysLeft ?? null,
    renewalReminder: !!e.renewalReminder,
    cancelling: !!e.cancelling,
    features: [...(e.features ?? [])],
    limits: e.limits,
  };
}
