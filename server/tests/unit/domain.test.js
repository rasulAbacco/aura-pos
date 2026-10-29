import { describe, it, expect } from 'vitest';
import { evaluateEntitlement, nextPeriod, addMonthsClamped } from '../../src/features/subscription/subscription.entitlements.js';
import { effectivePermissions } from '../../src/features/users/users.permissions.js';
import { commissionForLine, reverseCommission, splitTip } from '../../src/features/staff/staff.commission.js';
import { computePnL, proratedSalary } from '../../src/features/pnl/pnl.calculations.js';
import { verifyPaymentSignature, verifyWebhookSignature, signForTest } from '../../src/integrations/razorpay/razorpay.signature.js';
import { dec } from '../../src/core/money/money.js';

const day = 86400000;
const now = new Date('2026-10-28T12:00:00Z');
const plan = { code: 'pro-m', features: ['pos'], maxStaff: 5, maxBranches: 1, graceDays: 3, interval: 'MONTHLY' };
const tenant = { status: 'ACTIVE' };
const sub = (status, endOffsetDays, extra = {}) => ({ status, currentPeriodEnd: new Date(now.getTime() + endOffsetDays * day), ...extra });

describe('evaluateEntitlement', () => {
  it.each([
    ['ACTIVE well before end', sub('ACTIVE', 20), 'ACTIVE', true, true],
    ['TRIAL running', sub('TRIAL', 5), 'TRIAL', true, true],
    ['ACTIVE ended 1 day ago → GRACE', sub('ACTIVE', -1), 'GRACE', true, true],
    ['PAST_DUE ended 2 days ago → GRACE', sub('PAST_DUE', -2), 'GRACE', true, true],
    ['ACTIVE ended 4 days ago (grace 3) → EXPIRED', sub('ACTIVE', -4), 'EXPIRED', true, false],
    ['TRIAL ended → EXPIRED immediately (no grace on trials)', sub('TRIAL', -0.1), 'EXPIRED', true, false],
    ['CANCELLED still within paid period → ACTIVE', sub('CANCELLED', 3), 'ACTIVE', true, true],
    ['CANCELLED after period end → EXPIRED, no grace', sub('CANCELLED', -1, { cancelAtPeriodEnd: true }), 'EXPIRED', true, false],
    ['stored EXPIRED overrides dates', sub('EXPIRED', 10), 'EXPIRED', true, false],
  ])('%s', (_l, subscription, state, readable, writable) => {
    const e = evaluateEntitlement({ tenant, subscription, plan, now });
    expect(e.state).toBe(state);
    expect(e.readable).toBe(readable);
    expect(e.writable).toBe(writable);
  });

  it('suspension overrides an active paid subscription', () => {
    const e = evaluateEntitlement({ tenant: { status: 'SUSPENDED', suspendedReason: 'chargeback' }, subscription: sub('ACTIVE', 300), plan, now });
    expect(e).toMatchObject({ state: 'SUSPENDED', writable: false, readable: false, reason: 'chargeback' });
  });

  it('no subscription → read-only onboarding', () => {
    expect(evaluateEntitlement({ tenant, subscription: null, plan: null, now })).toMatchObject({ state: 'NONE', writable: false, readable: true });
  });

  it('flags renewal reminder within 7 days', () => {
    expect(evaluateEntitlement({ tenant, subscription: sub('ACTIVE', 6), plan, now }).renewalReminder).toBe(true);
    expect(evaluateEntitlement({ tenant, subscription: sub('ACTIVE', 9), plan, now }).renewalReminder).toBe(false);
  });
});

describe('nextPeriod / addMonthsClamped', () => {
  it('early renewal stacks onto remaining paid time', () => {
    const s = sub('ACTIVE', 10);
    const { start, end } = nextPeriod({ subscription: s, plan, now });
    expect(start.toISOString()).toBe(s.currentPeriodEnd.toISOString());
    expect(end > start).toBe(true);
  });
  it('late renewal starts from now', () => {
    expect(nextPeriod({ subscription: sub('ACTIVE', -10), plan, now }).start.toISOString()).toBe(now.toISOString());
  });
  it('trial conversion starts from now (trial days are not stacked)', () => {
    expect(nextPeriod({ subscription: sub('TRIAL', 5), plan, now }).start.toISOString()).toBe(now.toISOString());
  });
  it('clamps month ends', () => {
    expect(addMonthsClamped(new Date('2027-01-31T00:00:00Z'), 1).toISOString().slice(0, 10)).toBe('2027-02-28');
    expect(addMonthsClamped(new Date('2028-01-31T00:00:00Z'), 1).toISOString().slice(0, 10)).toBe('2028-02-29');
    expect(addMonthsClamped(new Date('2026-10-28T00:00:00Z'), 12).toISOString().slice(0, 10)).toBe('2027-10-28');
  });
});

describe('effectivePermissions', () => {
  it('owner has everything and cannot be revoked', () => {
    const p = effectivePermissions({ role: 'OWNER', permissionRevokes: ['pos.bill'] });
    expect(p.has('pos.bill')).toBe(true);
    expect(p.has('billing.manage')).toBe(true);
  });
  it('receptionist cannot refund or override price by default', () => {
    const p = effectivePermissions({ role: 'RECEPTIONIST' });
    expect(p.has('pos.bill')).toBe(true);
    expect(p.has('pos.refund')).toBe(false);
    expect(p.has('pos.price_override')).toBe(false);
  });
  it('grants and revokes are applied; unknown grants ignored', () => {
    const p = effectivePermissions({ role: 'RECEPTIONIST', permissionGrants: ['pos.refund', 'admin.everything'], permissionRevokes: ['pos.discount'] });
    expect(p.has('pos.refund')).toBe(true);
    expect(p.has('admin.everything')).toBe(false);
    expect(p.has('pos.discount')).toBe(false);
  });
});

describe('commission', () => {
  const staff = { serviceCommission: '35', productCommission: '10' };
  it('uses the retail rate for products (prototype D9 never used retailComm)', () => {
    expect(commissionForLine({ type: 'PRODUCT', taxableAmount: '1150' }, staff).amount.toFixed(2)).toBe('115.00');
    expect(commissionForLine({ type: 'SERVICE', taxableAmount: '2040' }, staff).amount.toFixed(2)).toBe('714.00');
  });
  it('earns nothing on membership sales or ineligible items', () => {
    expect(commissionForLine({ type: 'MEMBERSHIP', taxableAmount: '3999' }, staff)).toBeNull();
    expect(commissionForLine({ type: 'SERVICE', taxableAmount: '100' }, staff, { eligible: false })).toBeNull();
  });
  it('reverses proportionally on partial refund', () => {
    const r = reverseCommission({ baseAmount: '2000', ratePercent: '30', amount: '600' }, 1, 2);
    expect(r.amount.toFixed(2)).toBe('-300.00');
  });
  it('splits tips across distinct staff to the paisa', () => {
    const parts = splitTip('100', ['a', 'b', 'b', 'c']);
    expect(parts.map((p) => p.amount.toFixed(2))).toEqual(['33.34', '33.33', '33.33']);
  });
});

describe('P&L', () => {
  it('reproduces the prototype seed statement (₹1,34,866 loss) when fed the same inputs', () => {
    const p = computePnL({
      revenueByType: { SERVICE: 22300, PRODUCT: 6150, MEMBERSHIP: 3999 },
      baseSalaries: 98000,
      commissions: 4970 + 2940 + 2225 + 1380,
      expensesByCategory: { RENT: 35000, UTILITIES: 6850, SUPPLIES: 8400, HOUSEKEEPING: 2800, MARKETING: 3500, PANTRY: 1250 },
    });
    expect(p.revenue.total.toFixed(2)).toBe('32449.00');
    expect(p.staff.total.toFixed(2)).toBe('109515.00');
    expect(p.expenses.total.toFixed(2)).toBe('57800.00');
    expect(p.netProfit.toFixed(2)).toBe('-134866.00');
    expect(p.marginPercent.toFixed(1)).toBe('-415.6');
  });
  it('margin is null (not NaN/0) with no revenue', () => {
    expect(computePnL({}).marginPercent).toBeNull();
  });
  it('prorates salaries by frequency (prototype D11 ignored frequency)', () => {
    const oct1 = new Date('2026-10-01T00:00:00Z'), oct31 = new Date('2026-10-31T00:00:00Z');
    expect(proratedSalary(30000, 'MONTHLY', oct1, oct31).toFixed(2)).toBe('30000.00');
    expect(proratedSalary(7000, 'WEEKLY', oct1, oct31).toFixed(2)).toBe('31000.00');
    expect(proratedSalary(1000, 'DAILY', oct1, oct31).toFixed(2)).toBe('31000.00');
    // Oct 16 – Nov 15: half of Oct (16/31) + half of Nov (15/30)
    const mid = proratedSalary(31000, 'MONTHLY', new Date('2026-10-16T00:00:00Z'), new Date('2026-11-15T00:00:00Z'));
    expect(mid.toFixed(2)).toBe(dec(31000).times(16).dividedBy(31).plus(dec(31000).times(15).dividedBy(30)).toFixed(2));
  });
});

describe('Razorpay signatures', () => {
  const keySecret = 'test_secret', webhookSecret = 'wh_secret';
  it('accepts a valid checkout signature and rejects tampering', () => {
    const signature = signForTest('order_1|pay_1', keySecret);
    expect(verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature, keySecret })).toBe(true);
    expect(verifyPaymentSignature({ orderId: 'order_2', paymentId: 'pay_1', signature, keySecret })).toBe(false);
    expect(verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: 'zz', keySecret })).toBe(false);
    expect(verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: undefined, keySecret })).toBe(false);
  });
  it('verifies webhooks against raw bytes only', () => {
    const raw = Buffer.from('{"event":"payment.captured","x":1}');
    const sig = signForTest(raw, webhookSecret);
    expect(verifyWebhookSignature({ rawBody: raw, signature: sig, webhookSecret })).toBe(true);
    expect(verifyWebhookSignature({ rawBody: Buffer.from('{"event":"payment.captured", "x":1}'), signature: sig, webhookSecret })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: '{"event":"payment.captured","x":1}', signature: sig, webhookSecret })).toBe(false);
  });
});
