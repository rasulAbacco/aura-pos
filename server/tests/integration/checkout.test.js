import crypto from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma, resetDb, seedPlans, registerSalon, buildShop, addUser } from '../helpers/helpers.js';

let owner, shop;
const stockOf = async (itemId) => (await prisma.stockLevel.findFirst({ where: { itemId } })).quantity;
const svcLine = (item, staffId, extra = {}) => ({ type: 'SERVICE', itemId: item.id, quantity: 1, staffId, ...extra });
const prodLine = (item, quantity = 1, staffId) => ({ type: 'PRODUCT', itemId: item.id, quantity, staffId });

beforeAll(async () => {
  await resetDb();
  await seedPlans();
  owner = await registerSalon('Checkout Salon');
  shop = await buildShop(owner);
});

describe('quote & checkout calculations', () => {
  it('server prices from the catalogue; client-sent totals are irrelevant', async () => {
    const q = await owner.post('/api/v1/pos/quote', { lines: [svcLine(shop.haircut, shop.staff.id), prodLine(shop.shampoo, 2)], grandTotal: 1 });
    expect(q.status).toBe(200);
    expect(q.body.data).toMatchObject({ subtotal: '3250.00', taxTotal: '585.00', cgstTotal: '292.50', sgstTotal: '292.50', grandTotal: '3835.00' });
  });

  it('completes a split-payment checkout atomically with all side effects', async () => {
    const before = await stockOf(shop.shampoo.id);
    const res = await owner.checkout({
      customerId: shop.customer.id,
      lines: [svcLine(shop.spa, shop.staff.id), prodLine(shop.shampoo, 1, shop.staff.id)],
      tip: 100,
      payments: [{ method: 'UPI', amount: 3000, reference: 'UPI123' }, { method: 'CASH', amount: 1289 }],
    });
    expect(res.status).toBe(201);
    const inv = res.body.data;
    // 2400 + 1150 = 3550; GST 639; tip 100 → 4289
    expect(inv).toMatchObject({ status: 'PAID', subtotal: '3550.00', taxTotal: '639.00', tip: '100.00', grandTotal: '4289.00', amountDue: '0.00' });
    expect(inv.number).toMatch(/^MAIN\d{4}-000001$/);
    expect(inv.lines).toHaveLength(2);
    expect(inv.sellerSnapshot.branchCode).toBe('MAIN');

    expect(await stockOf(shop.shampoo.id)).toBe(before - 1);
    const mv = await prisma.stockMovement.findFirst({ where: { invoiceId: inv.id } });
    expect(mv).toMatchObject({ type: 'SALE', quantity: -1, balanceAfter: before - 1 });

    const comm = await prisma.commissionEntry.findMany({ where: { invoiceId: inv.id }, orderBy: { kind: 'asc' } });
    expect(comm.map((c) => [c.kind, c.amount.toFixed(2), c.ratePercent.toString()])).toEqual([
      ['PRODUCT', '115.00', '10'], ['SERVICE', '840.00', '35'], ['TIP', '100.00', '100'],
    ]);
    const cust = await prisma.customer.findUnique({ where: { id: shop.customer.id } });
    expect(cust.visitCount).toBe(1);
    expect(cust.lifetimeSpend.toFixed(2)).toBe('4189.00'); // excludes tip
  });

  it('numbers invoices sequentially per branch', async () => {
    const a = await owner.checkout({ lines: [svcLine(shop.haircut)], payments: [{ method: 'CASH', amount: 1121 }] });
    const b = await owner.checkout({ lines: [svcLine(shop.haircut)], payments: [{ method: 'CASH', amount: 1121 }] });
    const n = (x) => Number(x.body.data.number.split('-')[1]);
    expect(n(b)).toBe(n(a) + 1);
  });

  it('rejects short payment and overpayment', async () => {
    const short = await owner.checkout({ lines: [svcLine(shop.haircut)], payments: [{ method: 'CASH', amount: 100 }] });
    expect(short.body.error.code).toBe('PAYMENT_SHORT');
    const over = await owner.checkout({ lines: [svcLine(shop.haircut)], payments: [{ method: 'CASH', amount: 5000 }] });
    expect(over.body.error.code).toBe('OVERPAYMENT');
  });
});

describe('idempotency & concurrency', () => {
  it('replaying the same Idempotency-Key returns the original invoice', async () => {
    const key = crypto.randomUUID();
    const body = { lines: [svcLine(shop.haircut)], payments: [{ method: 'CASH', amount: 1121 }] };
    const first = await owner.checkout(body, key);
    const second = await owner.checkout(body, key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.meta.replayed).toBe(true);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await prisma.invoice.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it('concurrent double-submit with one key creates exactly one invoice', async () => {
    const key = crypto.randomUUID();
    const body = { lines: [svcLine(shop.haircut)], payments: [{ method: 'CASH', amount: 1121 }] };
    const results = await Promise.all(Array.from({ length: 5 }, () => owner.checkout(body, key)));
    expect(results.every((r) => [200, 201].includes(r.status))).toBe(true);
    expect(new Set(results.map((r) => r.body.data.id)).size).toBe(1);
    expect(await prisma.invoice.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it('never oversells: failed checkout rolls back completely', async () => {
    const stock = await stockOf(shop.shampoo.id);
    const invoicesBefore = await prisma.invoice.count();
    const res = await owner.checkout({ lines: [prodLine(shop.shampoo, stock + 1)], payments: [], allowPartial: true, customerId: shop.customer.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(await stockOf(shop.shampoo.id)).toBe(stock);
    expect(await prisma.invoice.count()).toBe(invoicesBefore);
  });

  it('concurrent sales of the last units: exactly the available quantity sells', async () => {
    const stock = await stockOf(shop.shampoo.id);
    const attempts = stock + 3;
    const results = await Promise.all(Array.from({ length: attempts }, () =>
      owner.checkout({ lines: [prodLine(shop.shampoo, 1)], payments: [{ method: 'CASH', amount: 1357 }] })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(stock);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    expect(await stockOf(shop.shampoo.id)).toBe(0);
  });
});

describe('wallet, memberships and discounts', () => {
  let member;
  it('selling a membership enrols the customer and credits the bonus (fixes prototype D8)', async () => {
    member = (await owner.post('/api/v1/clients', { name: 'Natasha', phone: '+919740098765' })).body.data;
    const res = await owner.checkout({ customerId: member.id, lines: [{ type: 'MEMBERSHIP', itemId: shop.plan.id, quantity: 1 }], payments: [{ method: 'CARD', amount: 4719 }] });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ grandTotal: '4719.00', roundOff: '0.18' }); // 3999 + 18 % = 4718.82 → rounded
    const ms = await prisma.customerMembership.findFirst({ where: { customerId: member.id } });
    expect(ms.status).toBe('ACTIVE');
    const c = await prisma.customer.findUnique({ where: { id: member.id } });
    expect(c.walletBalance.toFixed(2)).toBe('800.00');
    expect(await prisma.walletEntry.count({ where: { customerId: member.id, type: 'BONUS' } })).toBe(1);
  });

  it('applies the membership discount to services only and pays from wallet', async () => {
    // 2400 − 15 % = 2040 + 18 % = 2407.20 → rounded off to 2407
    const res = await owner.checkout({ customerId: member.id, offer: { kind: 'MEMBERSHIP' }, lines: [svcLine(shop.spa, shop.staff.id)], payments: [{ method: 'WALLET', amount: 800 }, { method: 'UPI', amount: 1607 }] });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ discountTotal: '360.00', grandTotal: '2407.00', roundOff: '-0.20' });
    expect((await prisma.customer.findUnique({ where: { id: member.id } })).walletBalance.toFixed(2)).toBe('0.00');
  });

  it('refuses wallet overspend without side effects', async () => {
    const res = await owner.checkout({ customerId: member.id, lines: [svcLine(shop.haircut)], payments: [{ method: 'WALLET', amount: 1121 }] });
    expect(res.body.error.code).toBe('INSUFFICIENT_WALLET');
    expect((await prisma.customer.findUnique({ where: { id: member.id } })).visitCount).toBe(2);
  });

  it('rejects a membership discount for non-members', async () => {
    const res = await owner.post('/api/v1/pos/quote', { customerId: shop.customer.id, offer: { kind: 'MEMBERSHIP' }, lines: [svcLine(shop.haircut)] });
    expect(res.body.error.code).toBe('NO_ACTIVE_MEMBERSHIP');
  });

  it('enforces coupon rules server-side', async () => {
    await owner.post('/api/v1/pos/coupons', { code: 'FLAT500', kind: 'FLAT', value: 500, minSubtotal: 2000, maxUses: 1 }).expect(201);
    const small = await owner.post('/api/v1/pos/quote', { offer: { kind: 'COUPON', couponCode: 'flat500' }, lines: [svcLine(shop.haircut)] });
    expect(small.body.error.code).toBe('COUPON_MIN_SUBTOTAL');
    const ok1 = await owner.checkout({ offer: { kind: 'COUPON', couponCode: 'FLAT500' }, lines: [svcLine(shop.spa)], payments: [{ method: 'CASH', amount: 2242 }] });
    expect(ok1.status).toBe(201);
    expect(ok1.body.data.discountTotal).toBe('500.00');
    const again = await owner.checkout({ offer: { kind: 'COUPON', couponCode: 'FLAT500' }, lines: [svcLine(shop.spa)], payments: [{ method: 'CASH', amount: 2242 }] });
    expect(again.body.error.code).toBe('COUPON_EXHAUSTED');
  });
});

describe('permissions at the counter', () => {
  let desk;
  beforeAll(async () => { desk = await addUser(owner.tenantId, 'RECEPTIONIST', { branchIds: [owner.branchId] }); });

  it('receptionist can bill at catalogue price but not override price or add custom items', async () => {
    expect((await desk.checkout({ lines: [svcLine(shop.haircut)], payments: [{ method: 'CASH', amount: 1121 }] })).status).toBe(201);
    expect((await desk.checkout({ lines: [svcLine(shop.haircut, undefined, { unitPrice: 1 })], payments: [{ method: 'CASH', amount: 1.18 }] })).status).toBe(403);
    expect((await desk.checkout({ lines: [{ type: 'CUSTOM', description: 'Fringe trim', unitPrice: 10, quantity: 1 }], payments: [{ method: 'CASH', amount: 11.8 }] })).status).toBe(403);
  });

  it('owner price override is allowed and audited', async () => {
    const res = await owner.checkout({ lines: [svcLine(shop.haircut, undefined, { unitPrice: 800 })], payments: [{ method: 'CASH', amount: 944 }] });
    expect(res.status).toBe(201);
    expect(res.body.data.lines[0]).toMatchObject({ unitPrice: '800.00', listPrice: '950.00' });
    expect(await prisma.auditLog.count({ where: { action: 'pos.price_override', entityId: res.body.data.id } })).toBe(1);
  });

  it('receptionist cannot refund or void, and sees sensitive notes as restricted', async () => {
    const inv = (await owner.checkout({ lines: [svcLine(shop.haircut)], payments: [{ method: 'CASH', amount: 1121 }] })).body.data;
    expect((await desk.post(`/api/v1/invoices/${inv.id}/void`, { reason: 'testing void' })).status).toBe(403);
    await owner.patch(`/api/v1/clients/${shop.customer.id}`, { colorFormula: 'Inoa 5.1 + 20 vol', allergies: 'PPD' });
    const seen = (await desk.get(`/api/v1/clients/${shop.customer.id}`)).body.data;
    expect(seen.colorFormula).toBe('[restricted]');
    expect(seen.allergies).toBe('[restricted]');
    expect((await owner.get(`/api/v1/clients/${shop.customer.id}`)).body.data.colorFormula).toBe('Inoa 5.1 + 20 vol');
  });
});

describe('refunds and voids', () => {
  it('partial refund issues a credit note, restocks, reverses commission proportionally', async () => {
    await owner.post('/api/v1/inventory/receipts', { itemId: shop.shampoo.id, quantity: 10, unitCost: 690 }).expect(201);
    const inv = (await owner.checkout({ customerId: shop.customer.id, lines: [prodLine(shop.shampoo, 2, shop.staff.id)], payments: [{ method: 'CARD', amount: 2714 }] })).body.data;
    const stockAfterSale = await stockOf(shop.shampoo.id);
    const res = await owner.post(`/api/v1/invoices/${inv.id}/refund`, { lines: [{ lineId: inv.lines[0].id, quantity: 1 }], payments: [{ method: 'CARD', amount: 1357 }], restock: true, reason: 'Customer returned unopened bottle' });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe('1357.00');
    expect(res.body.data.number).toMatch(/^CNMAIN/);
    expect(await stockOf(shop.shampoo.id)).toBe(stockAfterSale + 1);
    const orig = await prisma.invoice.findUnique({ where: { id: inv.id }, include: { lines: true } });
    expect(orig.status).toBe('PARTIALLY_REFUNDED');
    expect(orig.lines[0].refundedQuantity).toBe(1);
    const rev = await prisma.commissionEntry.findFirst({ where: { invoiceId: res.body.data.creditNoteId, kind: 'REVERSAL' } });
    expect(rev.amount.toFixed(2)).toBe('-115.00');
    // cannot refund more than remains
    const over = await owner.post(`/api/v1/invoices/${inv.id}/refund`, { lines: [{ lineId: inv.lines[0].id, quantity: 2 }], payments: [{ method: 'CARD', amount: 2714 }], reason: 'Too many units' });
    expect(over.body.error.code).toBe('REFUND_EXCEEDS');
  });

  it('same-day void reverses stock, wallet and commissions', async () => {
    const c = (await owner.post('/api/v1/clients', { name: 'Void Test', phone: '+919900000001' })).body.data;
    await owner.post(`/api/v1/clients/${c.id}/wallet/adjust`, { amount: 2000, type: 'TOPUP', reason: 'Prepaid top-up at desk' }).expect(201);
    const stock = await stockOf(shop.shampoo.id);
    const inv = (await owner.checkout({ customerId: c.id, lines: [prodLine(shop.shampoo, 1, shop.staff.id)], payments: [{ method: 'WALLET', amount: 1357 }] })).body.data;
    expect((await owner.post(`/api/v1/invoices/${inv.id}/void`, { reason: 'Billed to wrong customer' })).status).toBe(200);
    expect(await stockOf(shop.shampoo.id)).toBe(stock);
    expect((await prisma.customer.findUnique({ where: { id: c.id } })).walletBalance.toFixed(2)).toBe('2000.00');
    const sum = await prisma.commissionEntry.aggregate({ where: { invoiceId: inv.id }, _sum: { amount: true } });
    expect(sum._sum.amount.toFixed(2)).toBe('0.00');
    expect((await owner.post(`/api/v1/invoices/${inv.id}/void`, { reason: 'Billed to wrong customer' })).body.error.code).toBe('ALREADY_VOID');
  });
});
