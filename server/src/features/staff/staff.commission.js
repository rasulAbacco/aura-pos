/**
 * Commission rules (fixes prototype defects D9/D10):
 *   SERVICE / CUSTOM lines → staff.serviceCommission %
 *   PRODUCT lines          → staff.productCommission %
 *   MEMBERSHIP lines       → no commission
 * Base = line taxable amount (after discount, excluding GST). Tips are passed through
 * to the assigned staff at 100 % as a separate TIP entry. Rates are snapshotted on the
 * ledger row so future rate changes never rewrite earned amounts.
 */
import { dec, r2 } from '../../core/money/money.js';

export function commissionForLine(line, staff, { eligible = true } = {}) {
  if (!staff || !eligible || line.type === 'MEMBERSHIP') return null;
  const rate = dec(line.type === 'PRODUCT' ? staff.productCommission : staff.serviceCommission);
  if (rate.lessThanOrEqualTo(0)) return null;
  const base = r2(line.taxableAmount);
  return { kind: line.type === 'PRODUCT' ? 'PRODUCT' : 'SERVICE', baseAmount: base, ratePercent: rate, amount: r2(base.times(rate).dividedBy(100)) };
}

/** Reverse a fraction of an earned commission (refund of `refundQty` out of `qty`). */
export function reverseCommission(entry, refundQty, qty) {
  const fraction = dec(refundQty).dividedBy(qty);
  return {
    kind: 'REVERSAL',
    baseAmount: r2(dec(entry.baseAmount).times(fraction)).negated(),
    ratePercent: dec(entry.ratePercent),
    amount: r2(dec(entry.amount).times(fraction)).negated(),
  };
}

/** Split a tip equally across the distinct service staff on the bill (paise-exact). */
export function splitTip(tip, staffIds) {
  const t = r2(tip);
  const ids = [...new Set(staffIds.filter(Boolean))];
  if (t.lessThanOrEqualTo(0) || ids.length === 0) return [];
  const each = t.dividedBy(ids.length).toDecimalPlaces(2, 1 /* ROUND_DOWN */);
  const remainder = t.minus(each.times(ids.length)); // first staff member absorbs leftover paise
  return ids.map((staffId, i) => ({ staffId, amount: i === 0 ? each.plus(remainder) : each }));
}
