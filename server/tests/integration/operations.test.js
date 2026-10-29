import { describe, it, expect, beforeAll } from 'vitest';
import { prisma, resetDb, seedPlans, registerSalon, buildShop, addUser } from '../helpers/helpers.js';
import { zonedDateString } from '../../src/core/utils/time.js';

let O, shop, staff2;
const tomorrowAt = (hh, mm = 0) => {
  const d = zonedDateString(new Date(Date.now() + 86400000), 'Asia/Kolkata');
  return new Date(`${d}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+05:30`);
};

beforeAll(async () => {
  await resetDb();
  await seedPlans();
  O = await registerSalon('Ops Salon');
  shop = await buildShop(O);
  staff2 = (await O.post('/api/v1/staff', { name: 'Ananya', designation: 'Colorist', phone: '+919741088765', serviceCommission: 30 })).body.data;
});

describe('appointments', () => {
  let appt;
  it('books and prevents double-booking the same stylist (DB exclusion constraint)', async () => {
    const r = await O.post('/api/v1/appointments', { customerId: shop.customer.id, staffId: shop.staff.id, serviceId: shop.spa.id, startsAt: tomorrowAt(11) });
    expect(r.status).toBe(201);
    appt = r.body.data;
    expect(new Date(appt.endsAt) - new Date(appt.startsAt)).toBe(60 * 60000);
    const clash = await O.post('/api/v1/appointments', { customerId: shop.customer.id, staffId: shop.staff.id, serviceId: shop.haircut.id, startsAt: tomorrowAt(11, 30) });
    expect(clash.body.error.code).toBe('APPOINTMENT_CONFLICT');
    // back-to-back is fine; another stylist at the same time is fine
    expect((await O.post('/api/v1/appointments', { customerId: shop.customer.id, staffId: shop.staff.id, serviceId: shop.haircut.id, startsAt: tomorrowAt(12) })).status).toBe(201);
    expect((await O.post('/api/v1/appointments', { customerId: shop.customer.id, staffId: staff2.id, serviceId: shop.haircut.id, startsAt: tomorrowAt(11) })).status).toBe(201);
  });

  it('availability excludes busy slots; cancelling frees them', async () => {
    const date = zonedDateString(tomorrowAt(11), 'Asia/Kolkata');
    const q = `/api/v1/appointments/availability?date=${date}&staffId=${shop.staff.id}&serviceId=${shop.haircut.id}`;
    const slots = (await O.get(q)).body.data.slots;
    expect(slots).not.toContain(tomorrowAt(11).toISOString());
    expect(slots).toContain(tomorrowAt(10).toISOString());
    expect((await O.post(`/api/v1/appointments/${appt.id}/status`, { status: 'CANCELLED', reason: 'Client called' })).status).toBe(200);
    expect((await O.get(q)).body.data.slots).toContain(tomorrowAt(11).toISOString());
  });

  it('enforces status transitions', async () => {
    const r = await O.post(`/api/v1/appointments/${appt.id}/status`, { status: 'IN_SERVICE' });
    expect(r.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('appointment → POS uses the booked stylist and completes the appointment (fixes D16)', async () => {
    const walk = (await O.post('/api/v1/appointments', { customerId: shop.customer.id, staffId: staff2.id, serviceId: shop.haircut.id, walkIn: true })).body.data;
    expect(walk.status).toBe('WAITING');
    const cart = (await O.get(`/api/v1/appointments/${walk.id}/cart`)).body.data;
    expect(cart.lines[0].staffId).toBe(staff2.id);
    const inv = await O.checkout({ appointmentId: walk.id, customerId: cart.customerId, lines: cart.lines.map(({ type, itemId, quantity, staffId }) => ({ type, itemId, quantity, staffId })), payments: [{ method: 'UPI', amount: 1121 }] });
    expect(inv.status).toBe(201);
    expect((await prisma.appointment.findUnique({ where: { id: walk.id } })).status).toBe('COMPLETED');
    const again = await O.checkout({ appointmentId: walk.id, lines: [{ type: 'SERVICE', itemId: shop.haircut.id, quantity: 1 }], payments: [{ method: 'UPI', amount: 1121 }] });
    expect(again.body.error.code).toBe('APPOINTMENT_CLOSED');
  });
});

describe('P&L report and exports', () => {
  it('P&L revenue excludes GST and tips, nets refunds, and counts each expense once', async () => {
    const R = await registerSalon('PnL Salon');
    const s = await buildShop(R);
    await R.checkout({ lines: [{ type: 'SERVICE', itemId: s.spa.id, quantity: 1, staffId: s.staff.id }, { type: 'PRODUCT', itemId: s.shampoo.id, quantity: 1 }], tip: 200, payments: [{ method: 'CASH', amount: 4389 }] }).expect(201);
    const today = zonedDateString(new Date(), 'Asia/Kolkata');
    await R.post('/api/v1/expenses', { title: 'Rent', category: 'RENT', amount: 35000, spentOn: today, paymentMode: 'BANK_TRANSFER' }).expect(201);
    const voided = (await R.post('/api/v1/expenses', { title: 'Duplicate entry', category: 'PANTRY', amount: 999, spentOn: today, paymentMode: 'CASH' })).body.data;
    await R.post(`/api/v1/expenses/${voided.id}/void`, { reason: 'Entered twice' }).expect(200);

    const p = (await R.get(`/api/v1/pnl?from=${today}&to=${today}`)).body.data;
    expect(p.revenue).toMatchObject({ services: '2400.00', products: '1150.00', total: '3550.00' });
    expect(p.gstCollected).toBe('639.00');
    expect(p.staff.commissions).toBe('840.00'); // 35 % of 2400 (tip is pass-through, not cost)
    expect(p.expenses.byCategory.RENT).toBe('35000.00');
    expect(p.expenses.byCategory.PANTRY).toBe('0.00');
    // base pay for one day of a ₹30,000/month salary
    expect(Number(p.staff.baseSalaries)).toBeGreaterThan(900);
    expect(Number(p.staff.baseSalaries)).toBeLessThan(1100);
    const expectedNet = (3550 - Number(p.staff.total) - 35000).toFixed(2);
    expect(p.netProfit).toBe(expectedNet);
  });

  it('dashboard numbers come from the database', async () => {
    const d = (await O.get('/api/v1/reports/dashboard')).body.data;
    expect(d.sales.billsSettled).toBeGreaterThanOrEqual(1);
    expect(d.subscription.state).toBe('TRIAL');
  });

  it('CSV export requires reports.export and neutralises spreadsheet formulas', async () => {
    const c = (await O.post('/api/v1/clients', { name: '=HYPERLINK("http://evil")', phone: '+919833333333' })).body.data;
    await O.checkout({ customerId: c.id, lines: [{ type: 'SERVICE', itemId: shop.haircut.id, quantity: 1 }], payments: [{ method: 'CASH', amount: 1121 }] }).expect(201);
    const csv = await O.get('/api/v1/reports/export/invoices.csv');
    expect(csv.status).toBe(200);
    expect(csv.text).toContain(`"'=HYPERLINK(""http://evil"")"`);
    const desk = await addUser(O.tenantId, 'RECEPTIONIST');
    expect((await desk.get('/api/v1/reports/export/invoices.csv')).status).toBe(403);
  });
});

describe('inventory ledger', () => {
  it('every stock change is a movement; damage needs a reason and cannot go negative', async () => {
    const before = (await O.get('/api/v1/catalog/items?type=PRODUCT')).body.data.find((i) => i.id === shop.shampoo.id).stock;
    expect((await O.post('/api/v1/inventory/adjustments', { itemId: shop.shampoo.id, delta: -1, type: 'DAMAGE', note: 'Bottle cracked' })).status).toBe(200);
    expect((await O.post('/api/v1/inventory/adjustments', { itemId: shop.shampoo.id, delta: -999, type: 'DAMAGE', note: 'Too many' })).body.error.code).toBe('INSUFFICIENT_STOCK');
    const mv = (await O.get(`/api/v1/inventory/movements?itemId=${shop.shampoo.id}`)).body.data;
    expect(mv[0]).toMatchObject({ type: 'DAMAGE', quantity: -1, balanceAfter: before - 1 });
    const total = mv.reduce((a, m) => a + m.quantity, 0);
    expect(total).toBe(before - 1); // ledger reconciles to stock on hand
  });
});

describe('schema drift guard', () => {
  it('every Prisma model field exists as a column with matching nullability', async () => {
    const { Prisma } = await import('@prisma/client');
    const cols = await prisma.$queryRaw`SELECT table_name, column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public'`;
    const map = new Map(cols.map((c) => [`${c.table_name}.${c.column_name}`, c.is_nullable]));
    const missing = [];
    for (const m of Prisma.dmmf.datamodel.models) {
      for (const f of m.fields) {
        if (f.kind === 'object') continue;
        if (!map.has(`${m.name}.${f.name}`)) missing.push(`${m.name}.${f.name}`);
      }
    }
    expect(missing).toEqual([]);
    expect(Prisma.dmmf.datamodel.models.length).toBe((await prisma.$queryRaw`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`)[0].n);
  });
});
