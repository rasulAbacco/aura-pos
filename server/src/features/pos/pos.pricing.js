/**
 * Authoritative invoice calculation engine. Pure: no I/O, no clock.
 *
 * Rules (also documented in docs/02-architecture.md §6):
 *  1. gross(line) = unitPrice × qty, where unitPrice is in the tenant's price basis
 *     (tax-exclusive by default; tax-inclusive when pricesIncludeTax).
 *  2. ONE offer per invoice (matches the prototype's single "Discount Offer" select):
 *       MEMBERSHIP – percent on lines the plan covers (services and/or products)
 *       COUPON     – PERCENT or FLAT across eligible lines (all non-membership lines)
 *     FLAT amounts are allocated pro-rata with exact-paise largest-remainder allocation.
 *     A discount can never exceed the line gross. MEMBERSHIP-type lines are never discounted.
 *  3. Tax per line on (gross − discount). Exclusive: tax = round(net × rate).
 *     Inclusive: taxable = round(net ÷ (1 + rate)), tax = net − taxable.
 *     Intra-state → CGST = round(tax/2), SGST = tax − CGST. Inter-state → IGST = tax.
 *  4. Tip is neither discounted nor taxed and is not revenue.
 *  5. Optional round-off of the grand total to the nearest rupee, stored separately.
 */
import { D, ZERO, dec, r2, sum, allocate } from '../../core/money/money.js';
import { DomainError } from '../../core/errors/errors.js';

export const LINE_TYPES = ['SERVICE', 'PRODUCT', 'MEMBERSHIP', 'CUSTOM'];

function isEligible(line, offer) {
  if (line.type === 'MEMBERSHIP') return false;
  if (offer.kind === 'MEMBERSHIP') {
    if (line.type === 'PRODUCT') return !!offer.appliesToProducts;
    return !!offer.appliesToServices; // SERVICE and CUSTOM (custom charges are services)
  }
  return true;
}

/**
 * @param {object} input
 * @param {Array<{type,quantity,unitPrice,taxRate}>} input.lines  extra keys are passed through
 * @param {boolean} input.pricesIncludeTax
 * @param {boolean} input.intraState
 * @param {boolean} input.roundOff
 * @param {null|{kind:'MEMBERSHIP',percent,appliesToServices,appliesToProducts}|{kind:'COUPON',couponKind:'PERCENT'|'FLAT',value}} input.offer
 * @param {number|string} input.tip
 */
export function priceInvoice({ lines, pricesIncludeTax = false, intraState = true, roundOff = false, offer = null, tip = 0 }) {
  if (!Array.isArray(lines) || lines.length === 0) throw new DomainError('EMPTY_CART', 'Cart has no items');

  const work = lines.map((l, idx) => {
    if (!LINE_TYPES.includes(l.type)) throw new DomainError('BAD_LINE', `Line ${idx + 1}: unknown type`);
    if (!Number.isInteger(l.quantity) || l.quantity < 1) throw new DomainError('BAD_LINE', `Line ${idx + 1}: quantity must be a whole number ≥ 1`);
    const unit = dec(l.unitPrice);
    const rate = dec(l.taxRate);
    if (unit.isNegative()) throw new DomainError('BAD_LINE', `Line ${idx + 1}: price cannot be negative`);
    if (rate.isNegative() || rate.greaterThan(100)) throw new DomainError('BAD_LINE', `Line ${idx + 1}: tax rate must be 0–100`);
    return { ...l, unit: r2(unit), rate, gross: r2(unit.times(l.quantity)), discount: ZERO };
  });

  const tipD = r2(tip);
  if (tipD.isNegative()) throw new DomainError('BAD_TIP', 'Tip cannot be negative');

  // ── 2. discounts
  let offerApplied = null;
  if (offer) {
    const eligible = work.filter((l) => isEligible(l, offer) && l.gross.greaterThan(0));
    if (offer.kind === 'MEMBERSHIP' || (offer.kind === 'COUPON' && offer.couponKind === 'PERCENT')) {
      const pct = dec(offer.kind === 'MEMBERSHIP' ? offer.percent : offer.value);
      if (pct.isNegative() || pct.greaterThan(100)) throw new DomainError('BAD_DISCOUNT', 'Discount percent must be 0–100');
      for (const l of eligible) l.discount = r2(l.gross.times(pct).dividedBy(100));
    } else if (offer.kind === 'COUPON' && offer.couponKind === 'FLAT') {
      const eligibleGross = sum(eligible, (l) => l.gross);
      const flat = D.min(r2(offer.value), eligibleGross);
      if (flat.isNegative()) throw new DomainError('BAD_DISCOUNT', 'Flat discount cannot be negative');
      const parts = allocate(flat, eligible.map((l) => l.gross));
      eligible.forEach((l, i) => { l.discount = parts[i]; });
    } else {
      throw new DomainError('BAD_DISCOUNT', 'Unknown discount offer');
    }
    offerApplied = { ...offer, eligibleLines: eligible.length };
  }

  // ── 3. tax per line
  for (const l of work) {
    l.discount = D.min(l.discount, l.gross);
    const net = l.gross.minus(l.discount);
    if (pricesIncludeTax) {
      l.taxable = r2(net.dividedBy(D(1).plus(l.rate.dividedBy(100))));
      l.tax = net.minus(l.taxable);
    } else {
      l.taxable = net;
      l.tax = r2(net.times(l.rate).dividedBy(100));
    }
    if (intraState) {
      l.cgst = r2(l.tax.dividedBy(2));
      l.sgst = l.tax.minus(l.cgst);
      l.igst = ZERO;
    } else {
      l.cgst = ZERO; l.sgst = ZERO; l.igst = l.tax;
    }
    l.total = l.taxable.plus(l.tax);
  }

  // ── 4/5. totals
  const subtotal = sum(work, (l) => l.gross);
  const discountTotal = sum(work, (l) => l.discount);
  const taxableTotal = sum(work, (l) => l.taxable);
  const cgstTotal = sum(work, (l) => l.cgst);
  const sgstTotal = sum(work, (l) => l.sgst);
  const igstTotal = sum(work, (l) => l.igst);
  const taxTotal = cgstTotal.plus(sgstTotal).plus(igstTotal);
  const beforeRound = taxableTotal.plus(taxTotal).plus(tipD);
  const grandTotal = roundOff ? beforeRound.toDecimalPlaces(0, D.ROUND_HALF_UP) : beforeRound;
  const roundOffAmt = grandTotal.minus(beforeRound);

  const outLines = work.map(({ unit, rate, gross, discount, taxable, tax, cgst, sgst, igst, total, ...rest }) => ({
    ...rest,
    unitPrice: unit, taxRate: rate, grossAmount: gross, discountAmount: discount, taxableAmount: taxable,
    taxAmount: tax, cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst, totalAmount: total,
  }));

  return {
    lines: outLines,
    subtotal, discountTotal, taxableTotal, cgstTotal, sgstTotal, igstTotal, taxTotal,
    tip: tipD, roundOff: roundOffAmt, grandTotal, offer: offerApplied,
  };
}

/** Serialise a priced invoice's Decimals to 2-dp strings (for API responses). */
export function serialisePriced(p) {
  const conv = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v instanceof D ? (k === 'taxRate' ? v.toString() : v.toFixed(2)) : v]));
  return { ...conv(p), lines: p.lines.map(conv) };
}
