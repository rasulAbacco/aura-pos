import { describe, it, expect } from 'vitest';
import { priceInvoice, serialisePriced } from '../../src/features/pos/pos.pricing.js';
import { allocate, r2, sum } from '../../src/core/money/money.js';

const svc = (unitPrice, qty = 1, taxRate = 18) => ({ type: 'SERVICE', quantity: qty, unitPrice, taxRate });
const prod = (unitPrice, qty = 1, taxRate = 18) => ({ type: 'PRODUCT', quantity: qty, unitPrice, taxRate });
const s = (p) => serialisePriced(p);

describe('priceInvoice — basic GST', () => {
  it('computes tax-exclusive totals with exact CGST/SGST split', () => {
    const out = s(priceInvoice({ lines: [svc(950), prod(1150, 2)] }));
    expect(out.subtotal).toBe('3250.00');
    expect(out.taxTotal).toBe('585.00');
    expect(out.cgstTotal).toBe('292.50');
    expect(out.sgstTotal).toBe('292.50');
    expect(out.igstTotal).toBe('0.00');
    expect(out.grandTotal).toBe('3835.00');
  });

  it('uses IGST for inter-state supply', () => {
    const out = s(priceInvoice({ lines: [svc(1000)], intraState: false }));
    expect(out.igstTotal).toBe('180.00');
    expect(out.cgstTotal).toBe('0.00');
  });

  it('allows 0 % tax (prototype bug D4: `taxRate || 18` made 0 % impossible)', () => {
    const out = s(priceInvoice({ lines: [svc(500, 1, 0)] }));
    expect(out.taxTotal).toBe('0.00');
    expect(out.grandTotal).toBe('500.00');
  });

  it('splits an odd-paise tax so CGST + SGST equals the total exactly', () => {
    const out = priceInvoice({ lines: [svc('0.05')] }); // tax 0.009 → 0.01
    expect(out.cgstTotal.plus(out.sgstTotal).toFixed(2)).toBe(out.taxTotal.toFixed(2));
  });

  it('backs tax out of tax-inclusive prices', () => {
    const out = s(priceInvoice({ lines: [svc(1180)], pricesIncludeTax: true }));
    expect(out.taxableTotal).toBe('1000.00');
    expect(out.taxTotal).toBe('180.00');
    expect(out.grandTotal).toBe('1180.00');
  });

  it('supports mixed tax rates per line', () => {
    const out = s(priceInvoice({ lines: [svc(1000, 1, 18), prod(1000, 1, 5)] }));
    expect(out.taxTotal).toBe('230.00');
  });
});

describe('priceInvoice — discounts', () => {
  it('membership discount applies to services only by default (fixes D9 ambiguity)', () => {
    const out = s(priceInvoice({
      lines: [svc(2400), prod(3150)],
      offer: { kind: 'MEMBERSHIP', percent: 15, appliesToServices: true, appliesToProducts: false },
    }));
    expect(out.discountTotal).toBe('360.00');
    expect(out.lines[1].discountAmount).toBe('0.00');
  });

  it('membership discount can include products when the plan says so', () => {
    const out = s(priceInvoice({
      lines: [svc(1000), prod(1000)],
      offer: { kind: 'MEMBERSHIP', percent: 20, appliesToServices: true, appliesToProducts: true },
    }));
    expect(out.discountTotal).toBe('400.00');
  });

  it('never discounts a membership-purchase line', () => {
    const out = s(priceInvoice({
      lines: [{ type: 'MEMBERSHIP', quantity: 1, unitPrice: 3999, taxRate: 18 }],
      offer: { kind: 'COUPON', couponKind: 'PERCENT', value: 10 },
    }));
    expect(out.discountTotal).toBe('0.00');
  });

  it('allocates a flat coupon pro-rata to the exact paisa', () => {
    const out = priceInvoice({
      lines: [svc(333.33), svc(333.33), svc(333.34)],
      offer: { kind: 'COUPON', couponKind: 'FLAT', value: 100 },
    });
    expect(out.discountTotal.toFixed(2)).toBe('100.00');
    expect(sum(out.lines, (l) => l.discountAmount).toFixed(2)).toBe('100.00');
  });

  it('caps a flat coupon at the eligible amount (prototype: min(subtotal, 500))', () => {
    const out = s(priceInvoice({ lines: [svc(300)], offer: { kind: 'COUPON', couponKind: 'FLAT', value: 500 } }));
    expect(out.discountTotal).toBe('300.00');
    expect(out.grandTotal).toBe('0.00');
  });

  it('rejects out-of-range percent', () => {
    expect(() => priceInvoice({ lines: [svc(100)], offer: { kind: 'COUPON', couponKind: 'PERCENT', value: 120 } })).toThrow(/0–100/);
  });
});

describe('priceInvoice — tip, rounding, validation', () => {
  it('adds the tip after tax, untaxed', () => {
    const out = s(priceInvoice({ lines: [svc(1000)], tip: 100 }));
    expect(out.taxTotal).toBe('180.00');
    expect(out.grandTotal).toBe('1280.00');
  });

  it('rounds off to the nearest rupee and records the round-off separately', () => {
    const out = s(priceInvoice({ lines: [svc('99.99')], roundOff: true })); // 117.9882 → 117.99 → 118
    expect(out.grandTotal).toBe('118.00');
    expect(out.roundOff).toBe('0.01');
  });

  it('is decimal-exact where JS floats are not (prototype defect D3)', () => {
    const out = s(priceInvoice({ lines: [svc('0.1'), svc('0.2')], roundOff: false }));
    expect(out.subtotal).toBe('0.30');
    expect(0.1 + 0.2).not.toBe(0.3); // the float bug the prototype's arithmetic is exposed to
    // 1.005 × 100 in floats is 100.49999… — decimal rounding must still give 1.01
    expect(s(priceInvoice({ lines: [svc('1.005', 1, 0)] })).subtotal).toBe('1.01');
  });

  it('rejects empty carts, fractional quantities and negative prices', () => {
    expect(() => priceInvoice({ lines: [] })).toThrow(/no items/);
    expect(() => priceInvoice({ lines: [svc(100, 1.5)] })).toThrow(/whole number/);
    expect(() => priceInvoice({ lines: [svc(-1)] })).toThrow(/negative/);
    expect(() => priceInvoice({ lines: [svc(100)], tip: -5 })).toThrow(/Tip/);
  });
});

describe('allocate', () => {
  it('always sums exactly to the total', () => {
    for (const total of ['100', '0.01', '99.99', '1234.57']) {
      const parts = allocate(total, [1, 1, 1, 7, 13]);
      expect(sum(parts).toFixed(2)).toBe(r2(total).toFixed(2));
    }
  });
  it('returns zeros for zero weights', () => {
    expect(allocate(10, [0, 0]).map(String)).toEqual(['0', '0']);
  });
});
