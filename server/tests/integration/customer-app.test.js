import crypto from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import { api, prisma, resetDb, seedPlans, registerSalon, buildShop, addUser, setSubscription } from '../helpers/helpers.js';

/** Customer signs in with mobile number + SMS code (the test server returns the code as devCode). */
async function customerLogin(phone, { native = false } = {}) {
  // Signing the same number in again within 30 s is refused (resend wait): pretend earlier codes are older.
  await prisma.customerOtp.updateMany({ where: { phone: phone.replace(/\D/g, '').slice(-10) }, data: { createdAt: new Date(Date.now() - 120000) } });
  const otp = await api().post('/api/v1/customer/auth/otp').send({ phone });
  expect(otp.status).toBe(200);
  const req = api().post('/api/v1/customer/auth/verify');
  if (native) req.set('X-Client-Platform', 'native');
  const v = await req.send({ phone, code: otp.body.data.devCode });
  expect(v.status).toBe(200);
  const token = v.body.data.accessToken;
  const auth = (r) => r.set('Authorization', `Bearer ${token}`);
  return {
    data: v.body.data, cookies: v.headers['set-cookie'],
    get: (u) => auth(api().get(u)), post: (u, b) => auth(api().post(u)).send(b ?? {}), patch: (u, b) => auth(api().patch(u)).send(b ?? {}),
  };
}
const tomorrow = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + 86400000));

let owner; let shop; let slug; let other;

beforeAll(async () => {
  await resetDb();
  await seedPlans();
  owner = await registerSalon('Glow Studio');
  shop = await buildShop(owner);
  slug = (await prisma.tenant.findUnique({ where: { id: owner.tenantId } })).slug;
  await prisma.tenant.update({ where: { id: owner.tenantId }, data: { category: 'UNISEX_SALON' } });
  await prisma.branch.update({ where: { id: owner.branchId }, data: { city: 'Bengaluru' } });
  other = await registerSalon('Hidden Spa');
  await prisma.tenant.update({ where: { id: other.tenantId }, data: { appListed: false, category: 'SPA' } });
});

describe('customer sign-in by mobile number', () => {
  it('sends a code, signs in, and creates the account once', async () => {
    const c = await customerLogin('+91 98860 12345');
    expect(c.data.account.phone).toBe('9886012345');
    expect(c.data.needsName).toBe(true);
    expect(c.cookies.join(';')).toMatch(/sg_cust_rt=.*Path=\/api\/v1\/customer\/auth/);
    const again = await customerLogin('09886012345');
    expect(again.data.account.id).toBe(c.data.account.id);
  });

  it('rejects wrong codes, limits tries, and makes codes single-use', async () => {
    const phone = '9000000001';
    const otp = (await api().post('/api/v1/customer/auth/otp').send({ phone })).body.data;
    const wrong = await api().post('/api/v1/customer/auth/verify').send({ phone, code: otp.devCode === '000000' ? '111111' : '000000' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.message).toMatch(/Wrong code\. 4 tries left/);
    const good = await api().post('/api/v1/customer/auth/verify').send({ phone, code: otp.devCode });
    expect(good.status).toBe(200);
    const reuse = await api().post('/api/v1/customer/auth/verify').send({ phone, code: otp.devCode });
    expect(reuse.status).toBe(400);
    const tooSoon = await api().post('/api/v1/customer/auth/otp').send({ phone });
    expect(tooSoon.status).toBe(429);
    expect((await api().post('/api/v1/customer/auth/otp').send({ phone: '12345' })).status).toBe(400);
  });

  it('the phone app gets a rotating refresh token in the body', async () => {
    const c = await customerLogin('9000000002', { native: true });
    expect(c.data.refreshToken).toBeTruthy();
    const r = await api().post('/api/v1/customer/auth/refresh').set('X-Client-Platform', 'native').set('X-Requested-With', 'XMLHttpRequest').send({ refreshToken: c.data.refreshToken });
    expect(r.status).toBe(200);
    expect(r.body.data.refreshToken).not.toBe(c.data.refreshToken);
  });

  it('customer tokens cannot call salon or platform APIs, and salon tokens cannot call customer APIs', async () => {
    const c = await customerLogin('9000000003');
    expect((await c.get('/api/v1/clients')).status).toBe(401);
    expect((await c.get('/api/v1/platform/tenants')).status).toBe(401);
    expect((await owner.get('/api/v1/customer/me')).status).toBe(401);
  });
});

describe('discover salons', () => {
  it('lists only listed salons with an active subscription, filtered by category and city', async () => {
    const all = (await api().get('/api/v1/customer/salons')).body.data;
    expect(all.map((s) => s.name)).toEqual(['Glow Studio']);
    expect(all[0]).toMatchObject({ category: 'UNISEX_SALON', cities: ['Bengaluru'], serviceCount: 2, productCount: 1, startingFrom: '950.00' });
    expect((await api().get('/api/v1/customer/salons?category=SPA')).body.data).toEqual([]);
    expect((await api().get('/api/v1/customer/salons?city=benga')).body.data).toHaveLength(1);
    expect((await api().get('/api/v1/customer/salons?q=hair%20spa')).body.data).toHaveLength(1);
    expect((await api().get(`/api/v1/customer/salons/${(await prisma.tenant.findUnique({ where: { id: other.tenantId } })).slug}`)).status).toBe(404);
  });

  it('shows services, stylists, and products with stock per branch', async () => {
    const d = (await api().get(`/api/v1/customer/salons/${slug}`)).body.data;
    expect(d.services.map((s) => s.name).sort()).toEqual(['Hair Spa', 'Haircut']);
    expect(d.products[0]).toMatchObject({ name: 'Shampoo', stock: { [owner.branchId]: 5 } });
    expect(d.staff.map((s) => s.name)).toEqual(['Vikram']);
  });

  it('an expired salon disappears from the app', async () => {
    await setSubscription(owner.tenantId, 'starter', { status: 'EXPIRED', endsInDays: -30 });
    expect((await api().get('/api/v1/customer/salons')).body.data).toEqual([]);
    await setSubscription(owner.tenantId, 'starter', { status: 'ACTIVE', endsInDays: 30 });
    expect((await api().get('/api/v1/customer/salons')).body.data).toHaveLength(1);
  });
});

describe('booking requests', () => {
  let pooja; let booking;

  beforeAll(async () => {
    pooja = await customerLogin('9886012345'); // the salon already has Pooja under this number
    await pooja.patch('/api/v1/customer/me', { name: 'Pooja S' });
  });

  it('needs a name before booking', async () => {
    const anon = await customerLogin('9000000004');
    const r = await anon.post('/api/v1/customer/bookings', { requestId: crypto.randomUUID(), branchId: owner.branchId, serviceIds: [shop.haircut.id], startsAt: new Date(Date.now() + 86400000) });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('NAME_REQUIRED');
  });

  it('shows free slots and books two services back to back on the salon’s existing client record', async () => {
    const s = (await api().get(`/api/v1/customer/salons/${slug}/slots?branchId=${owner.branchId}&serviceIds=${shop.haircut.id},${shop.spa.id}&date=${tomorrow()}`)).body.data;
    expect(s.durationMin).toBe(105);
    expect(s.slots.length).toBeGreaterThan(5);
    const body = { requestId: crypto.randomUUID(), branchId: owner.branchId, serviceIds: [shop.haircut.id, shop.spa.id], startsAt: s.slots[0].at, notes: 'Short layers please' };
    const r = await pooja.post('/api/v1/customer/bookings', body);
    expect(r.status).toBe(201);
    booking = r.body.data;
    expect(booking).toMatchObject({ status: 'BOOKED', source: 'APP', staffName: 'Vikram', salon: { name: 'Glow Studio' } });
    expect(booking.services.map((x) => x.name)).toEqual(['Haircut', 'Hair Spa']);
    expect(new Date(booking.services[1].startsAt).getTime()).toBe(new Date(booking.services[0].endsAt).getTime());
    // linked to the existing client, not a duplicate
    const appts = await prisma.appointment.findMany({ where: { bookingGroup: booking.id } });
    expect(new Set(appts.map((a) => a.customerId))).toEqual(new Set([shop.customer.id]));
    // same request again (double tap) → same booking
    const again = await pooja.post('/api/v1/customer/bookings', body);
    expect(again.body.data.id).toBe(booking.id);
    expect(await prisma.appointment.count({ where: { bookingGroup: booking.id } })).toBe(2);
    // the slot is now taken
    const after = (await api().get(`/api/v1/customer/salons/${slug}/slots?branchId=${owner.branchId}&serviceIds=${shop.haircut.id}&date=${tomorrow()}`)).body.data;
    expect(after.slots.map((x) => x.at)).not.toContain(s.slots[0].at);
  });

  it('refuses a taken time and a time when the salon is closed', async () => {
    const other = await customerLogin('9000000005');
    await other.patch('/api/v1/customer/me', { name: 'Ravi' });
    const taken = await other.post('/api/v1/customer/bookings', { requestId: crypto.randomUUID(), branchId: owner.branchId, serviceIds: [shop.haircut.id], startsAt: booking.startsAt });
    expect(taken.status).toBe(409);
    const night = new Date(`${tomorrow()}T23:30:00+05:30`);
    const closed = await other.post('/api/v1/customer/bookings', { requestId: crypto.randomUUID(), branchId: owner.branchId, serviceIds: [shop.haircut.id], startsAt: night });
    expect(closed.status).toBe(400);
  });

  it('the salon sees the request, the counts, and confirms it; the customer sees it confirmed', async () => {
    const sum = (await owner.get('/api/v1/online/summary')).body.data;
    expect(sum.bookings).toMatchObject({ pending: 1, upcomingConfirmed: 0 });
    const list = (await owner.get('/api/v1/online/bookings?view=pending')).body.data;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: booking.id, customer: { name: 'Pooja' }, notes: 'Short layers please' });
    expect(list[0].services).toHaveLength(2);
    const ok = await owner.post(`/api/v1/online/bookings/${booking.id}/confirm`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('CONFIRMED');
    expect((await owner.get('/api/v1/online/summary')).body.data.bookings).toMatchObject({ pending: 0, upcomingConfirmed: 1 });
    const mine = (await pooja.get('/api/v1/customer/bookings')).body.data;
    expect(mine.find((b) => b.id === booking.id)).toMatchObject({ status: 'CONFIRMED', canCancel: true });
  });

  it('billing the booking at the counter puts both services on one bill and completes the booking', async () => {
    const first = (await prisma.appointment.findFirst({ where: { bookingGroup: booking.id }, orderBy: { startsAt: 'asc' } })).id;
    const cart = (await owner.get(`/api/v1/appointments/${first}/cart`)).body.data;
    expect(cart.lines.map((l) => l.description)).toEqual(['Haircut', 'Hair Spa']);
    const inv = await owner.checkout({ appointmentId: first, customerId: cart.customerId, lines: cart.lines.map(({ type, itemId, quantity, staffId }) => ({ type, itemId, quantity, staffId })), payments: [{ method: 'UPI', amount: 3953 }] });
    expect(inv.status).toBe(201);
    const statuses = (await prisma.appointment.findMany({ where: { bookingGroup: booking.id } })).map((a) => a.status);
    expect(statuses).toEqual(['COMPLETED', 'COMPLETED']);
    const mine = (await pooja.get('/api/v1/customer/bookings')).body.data.find((b) => b.id === booking.id);
    expect(mine).toMatchObject({ status: 'COMPLETED', canCancel: false });
  });

  it('customer cancels; salon declines with a reason the customer sees', async () => {
    const s = (await api().get(`/api/v1/customer/salons/${slug}/slots?branchId=${owner.branchId}&serviceIds=${shop.haircut.id}&date=${tomorrow()}`)).body.data;
    const a = (await pooja.post('/api/v1/customer/bookings', { requestId: crypto.randomUUID(), branchId: owner.branchId, serviceIds: [shop.haircut.id], startsAt: s.slots.at(-1).at })).body.data;
    const c = await pooja.post(`/api/v1/customer/bookings/${a.id}/cancel`, { reason: 'Plans changed' });
    expect(c.body.data).toMatchObject({ status: 'CANCELLED', cancelReason: 'Cancelled by customer: Plans changed' });
    const b = (await pooja.post('/api/v1/customer/bookings', { requestId: crypto.randomUUID(), branchId: owner.branchId, serviceIds: [shop.haircut.id], startsAt: s.slots.at(-2).at })).body.data;
    const d = await owner.post(`/api/v1/online/bookings/${b.id}/decline`, { reason: 'Stylist on leave' });
    expect(d.body.data.status).toBe('CANCELLED');
    expect((await pooja.get('/api/v1/customer/bookings')).body.data.find((x) => x.id === b.id).cancelReason).toBe('Declined by salon: Stylist on leave');
    expect((await owner.get('/api/v1/online/summary')).body.data.bookings.last30).toMatchObject({ declined: 1, cancelledByCustomer: 1, completed: 1 });
  });

  it('another customer cannot see or cancel someone else’s booking', async () => {
    const stranger = await customerLogin('9000000006');
    expect((await stranger.get('/api/v1/customer/bookings')).body.data).toEqual([]);
    expect((await stranger.post(`/api/v1/customer/bookings/${booking.id}/cancel`)).status).toBe(404);
  });

  it('turning off online booking for the branch stops new requests', async () => {
    await owner.patch(`/api/v1/settings/branches/${owner.branchId}`, { onlineBooking: false });
    const r = await pooja.post('/api/v1/customer/bookings', { requestId: crypto.randomUUID(), branchId: owner.branchId, serviceIds: [shop.haircut.id], startsAt: new Date(Date.now() + 2 * 86400000) });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('ONLINE_BOOKING_OFF');
    await owner.patch(`/api/v1/settings/branches/${owner.branchId}`, { onlineBooking: true });
  });
});

describe('product orders (click and collect)', () => {
  let neha; let order;

  beforeAll(async () => {
    neha = await customerLogin('9811122233');
    await neha.patch('/api/v1/customer/me', { name: 'Neha' });
  });

  it('places an order within stock; the units are held for it', async () => {
    const r = await neha.post('/api/v1/customer/orders', { requestId: crypto.randomUUID(), branchId: owner.branchId, items: [{ itemId: shop.shampoo.id, quantity: 3 }] });
    expect(r.status).toBe(201);
    order = r.body.data;
    expect(order).toMatchObject({ status: 'PLACED', number: 'MAIN-O1', itemsTotal: '3450.00', canCancel: true });
    const d = (await api().get(`/api/v1/customer/salons/${slug}`)).body.data;
    expect(d.products[0].stock[owner.branchId]).toBe(2);
    const tooMany = await neha.post('/api/v1/customer/orders', { requestId: crypto.randomUUID(), branchId: owner.branchId, items: [{ itemId: shop.shampoo.id, quantity: 3 }] });
    expect(tooMany.status).toBe(422);
    expect(tooMany.body.error.message).toMatch(/Only 2 × Shampoo left/);
    // a new client record was created at the salon for this number
    expect(await prisma.customer.count({ where: { tenantId: owner.tenantId, phone: '9811122233' } })).toBe(1);
  });

  it('the salon marks it ready and bills it at the counter, which completes it and takes stock', async () => {
    expect((await owner.get('/api/v1/online/summary')).body.data.orders).toMatchObject({ new: 1, open: 1 });
    expect((await owner.post(`/api/v1/online/orders/${order.id}/status`, { status: 'READY' })).body.data.status).toBe('READY');
    expect((await neha.post(`/api/v1/customer/orders/${order.id}/cancel`)).status).toBe(409); // packed: call the salon
    const cart = (await owner.get(`/api/v1/online/orders/${order.id}/cart`)).body.data;
    expect(cart).toMatchObject({ shopOrderId: order.id, lines: [{ type: 'PRODUCT', itemId: shop.shampoo.id, quantity: 3 }] });
    const inv = await owner.checkout({ shopOrderId: order.id, customerId: cart.customerId, lines: cart.lines.map(({ type, itemId, quantity }) => ({ type, itemId, quantity })), payments: [{ method: 'CASH', amount: 4071 }] });
    expect(inv.status).toBe(201);
    const mine = (await neha.get('/api/v1/customer/orders')).body.data[0];
    expect(mine).toMatchObject({ status: 'COLLECTED', canCancel: false });
    expect((await prisma.stockLevel.findFirst({ where: { branchId: owner.branchId, itemId: shop.shampoo.id } })).quantity).toBe(2);
    const again = await owner.checkout({ shopOrderId: order.id, customerId: cart.customerId, lines: [{ type: 'PRODUCT', itemId: shop.shampoo.id, quantity: 1 }], payments: [{ method: 'CASH', amount: 1357 }] });
    expect(again.status).toBe(409);
  });

  it('customer can cancel a new order; someone without the respond right cannot see orders', async () => {
    const o = (await neha.post('/api/v1/customer/orders', { requestId: crypto.randomUUID(), branchId: owner.branchId, items: [{ itemId: shop.shampoo.id, quantity: 1 }] })).body.data;
    expect((await neha.post(`/api/v1/customer/orders/${o.id}/cancel`, { reason: 'Bought elsewhere' })).body.data.status).toBe('CANCELLED');
    // Every role can answer app requests by default; the owner can take that right away per person.
    const accountant = await addUser(owner.tenantId, 'ACCOUNTANT', { permissionRevokes: ['online.respond'] });
    expect((await accountant.get('/api/v1/online/orders')).status).toBe(403);
  });

  it('my salons shows visits, spend and recent bills for this number', async () => {
    const pooja = await customerLogin('9886012345');
    const mine = (await pooja.get('/api/v1/customer/my-salons')).body.data;
    expect(mine[0]).toMatchObject({ salon: { name: 'Glow Studio' }, visits: 1 });
    expect(mine[0].recentBills).toHaveLength(1);
  });
});

describe('platform view', () => {
  it('salon list filters by category and app listing', async () => {
    const { prisma: db } = await import('../helpers/helpers.js');
    const { hashPassword } = await import('../../src/features/auth/auth.sessions.js');
    await db.platformAdmin.create({ data: { email: 'pa@aura.test', name: 'PA', role: 'SUPER_ADMIN', passwordHash: await hashPassword('super-password-123') } });
    const login = await api().post('/api/v1/platform/auth/login').send({ email: 'pa@aura.test', password: 'super-password-123' });
    const t = login.body.data.accessToken;
    const spa = await api().get('/api/v1/platform/salons?category=SPA').set('Authorization', `Bearer ${t}`);
    expect(spa.body.data.map((s) => s.displayName)).toEqual(['Hidden Spa']);
    const hidden = await api().get('/api/v1/platform/salons?inApp=no').set('Authorization', `Bearer ${t}`);
    expect(hidden.body.data.map((s) => s.displayName)).toEqual(['Hidden Spa']);
    const stats = await api().get('/api/v1/platform/stats').set('Authorization', `Bearer ${t}`);
    expect(stats.body.data.customerApp).toMatchObject({ listedSalons: 1, salonsByCategory: { SPA: 1, UNISEX_SALON: 1 } });
    expect(stats.body.data.customerApp.accounts).toBeGreaterThanOrEqual(5);
  });
});
