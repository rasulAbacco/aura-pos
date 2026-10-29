import Decimal from 'decimal.js';

// One configured Decimal constructor for all money math. Never use JS numbers for money.
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export const ZERO = new D(0);

/** Coerce number | string | Decimal | Prisma.Decimal | null to D. */
export function dec(v) {
  if (v === null || v === undefined || v === '') return ZERO;
  if (v instanceof D) return v;
  return new D(typeof v === 'object' && typeof v.toString === 'function' ? v.toString() : v);
}

/** Round to paise (2 dp, half-up). */
export const r2 = (v) => dec(v).toDecimalPlaces(2, D.ROUND_HALF_UP);

/** Serialise for JSON / Prisma: fixed 2-dp string, e.g. "1150.00". */
export const s2 = (v) => r2(v).toFixed(2);

export const sum = (arr, pick = (x) => x) => arr.reduce((acc, x) => acc.plus(dec(pick(x))), ZERO);

/** Convert rupees to integer paise for payment gateways. */
export const toPaise = (v) => r2(v).times(100).toNumber();

/**
 * Split `total` across `weights` so the parts are 2-dp and sum EXACTLY to `total`
 * (largest-remainder method). Used for pro-rata discount allocation.
 */
export function allocate(total, weights) {
  const t = r2(total);
  const w = weights.map(dec);
  const wSum = sum(w);
  if (wSum.isZero()) return w.map(() => ZERO);
  const raw = w.map((x) => t.times(x).dividedBy(wSum));
  const floored = raw.map((x) => x.toDecimalPlaces(2, D.ROUND_DOWN));
  let remainderPaise = t.minus(sum(floored)).times(100).round().toNumber();
  const order = raw
    .map((x, i) => ({ i, frac: x.minus(floored[i]) }))
    .sort((a, b) => b.frac.comparedTo(a.frac) || a.i - b.i);
  const parts = [...floored];
  for (let k = 0; remainderPaise > 0; k = (k + 1) % order.length, remainderPaise--) {
    parts[order[k].i] = parts[order[k].i].plus('0.01');
  }
  return parts;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
export const formatINR = (v) => inr.format(r2(v).toNumber());
