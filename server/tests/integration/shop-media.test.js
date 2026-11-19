import crypto from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import { api, prisma, resetDb, seedPlans, registerSalon, buildShop, addUser } from '../helpers/helpers.js';

// Smallest valid-looking files (the server checks the first bytes, not the whole picture).
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), crypto.randomBytes(400)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), crypto.randomBytes(200)]);
const upload = (c, url, buf, type = 'image/jpeg') => api().post(url).set('Authorization', `Bearer ${c.token}`).set('Content-Type', type).send(buf);
const tomorrow = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + 86400000));

let owner; let shop; let slug;
beforeAll(async () => {
  await resetDb();
  await seedPlans();
  owner = await registerSalon('Bloom Studio');
  shop = await buildShop(owner);
  slug = (await prisma.tenant.findUnique({ where: { id: owner.tenantId } })).slug;
});

describe('product photos and shop details', () => {
  it('uploads up to 3 photos per product, rejects non-images, serves them publicly with caching', async () => {
    const url = `/api/v1/catalog/items/${shop.shampoo.id}/images`;
    const a = await upload(owner, `${url}?w=800&h=800`, JPEG);
    expect(a.status).toBe(201);
    expect(a.body.data).toMatchObject({ position: 0, width: 800 });
    expect((await upload(owner, url, PNG, 'image/png')).status).toBe(201);
    const fake = await upload(owner, url, Buffer.from('not really an image at all'), 'image/jpeg');
    expect(fake.status).toBe(400);
    expect((await upload(owner, url, JPEG)).status).toBe(201);
    const fourth = await upload(owner, url, JPEG);
    expect(fourth.status).toBe(422);
    expect(fourth.body.error.message).toMatch(/Up to 3 photos/);

    const img = await api().get(`/api/v1/media/${a.body.data.id}`);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/jpeg');
    expect(img.headers['cache-control']).toMatch(/immutable/);
    expect(img.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(Buffer.compare(img.body, JPEG)).toBe(0);
    expect((await api().get(`/api/v1/media/${a.body.data.id}`).set('If-None-Match', img.headers.etag)).status).toBe(304);
  });

  it('reorders (first = main) and removes photos; positions close up', async () => {
    const list = (await owner.get(`/api/v1/catalog/items/${shop.shampoo.id}/images`)).body.data;
    const ids = list.map((x) => x.id).reverse();
    const r = await owner.put(`/api/v1/catalog/items/${shop.shampoo.id}/images/order`, { ids });
    expect(r.body.data.map((x) => x.id)).toEqual(ids);
    expect((await owner.del(`/api/v1/media/${ids[0]}`)).status).toBe(200);
    const after = (await owner.get(`/api/v1/catalog/items/${shop.shampoo.id}/images`)).body.data;
    expect(after.map((x) => x.position)).toEqual([0, 1]);
    expect((await api().get(`/api/v1/media/${ids[0]}`)).status).toBe(404);
  });

  it('only the salon that owns the product can add photos; a stylist cannot', async () => {
    const other = await registerSalon('Other Salon');
    expect((await upload(other, `/api/v1/catalog/items/${shop.shampoo.id}/images`, JPEG)).status).toBe(404);
    const stylist = await addUser(owner.tenantId, 'STYLIST');
    expect((await upload(stylist, `/api/v1/catalog/items/${shop.shampoo.id}/images`, JPEG)).status).toBe(403);
  });

  it('shows brand, size, MRP and details in the app; hidden items stay out of the app and can’t be ordered', async () => {
    await owner.patch(`/api/v1/catalog/items/${shop.shampoo.id}`, { brand: 'Kerastase', size: '250 ml', mrp: '1500.00', highlights: 'Repairs\nShine', howToUse: 'Apply, rinse', ingredients: 'Aqua' });
    const d = (await api().get(`/api/v1/customer/salons/${slug}`)).body.data;
    expect(d.products[0]).toMatchObject({ brand: 'Kerastase', size: '250 ml', mrp: '1500.00', price: '1150.00', highlights: 'Repairs\nShine' });
    expect(d.products[0].images).toHaveLength(2);
    // MRP not above the price → not shown as a discount
    await owner.patch(`/api/v1/catalog/items/${shop.shampoo.id}`, { mrp: '1000.00' });
    expect((await api().get(`/api/v1/customer/salons/${slug}`)).body.data.products[0].mrp).toBeNull();
    const shopList = (await api().get('/api/v1/customer/products?q=kera')).body.data;
    expect(shopList[0]).toMatchObject({ name: 'Shampoo', brand: 'Kerastase', salon: { name: 'Bloom Studio' } });
    expect(shopList[0].imageId).toBeTruthy();

    await owner.patch(`/api/v1/catalog/items/${shop.shampoo.id}`, { showInApp: false });
    expect((await api().get(`/api/v1/customer/salons/${slug}`)).body.data.products).toEqual([]);
    expect((await api().get('/api/v1/customer/products')).body.data).toEqual([]);
    await owner.patch(`/api/v1/catalog/items/${shop.shampoo.id}`, { showInApp: true });
  });
});

describe('salon photos and branch location', () => {
  it('salon photos (up to 6) appear as the cover in the app', async () => {
    const p = await upload(owner, '/api/v1/settings/photos', JPEG);
    expect(p.status).toBe(201);
    const list = (await api().get('/api/v1/customer/salons')).body.data;
    expect(list[0].coverImageId).toBe(p.body.data.id);
    expect((await api().get(`/api/v1/customer/salons/${slug}`)).body.data.photos).toHaveLength(1);
  });

  it('saves the branch map position and opening hours; free times follow the hours', async () => {
    const r = await owner.patch(`/api/v1/settings/branches/${owner.branchId}`, { latitude: 12.9716, longitude: 77.6412, businessHours: { mon: [['07:00', '12:00'], ['13:00', '21:30']], tue: [['07:00', '21:30']], wed: [['07:00', '21:30']], thu: [['07:00', '21:30']], fri: [['07:00', '21:30']], sat: [['07:00', '21:30']], sun: [['07:00', '21:30']] } });
    expect(r.status).toBe(200);
    const list = (await api().get('/api/v1/customer/salons')).body.data;
    expect(list[0].points).toEqual([{ branchId: owner.branchId, name: 'Main Branch', lat: 12.9716, lng: 77.6412 }]);
    const s = (await api().get(`/api/v1/customer/salons/${slug}/slots?branchId=${owner.branchId}&serviceIds=${shop.haircut.id}&date=${tomorrow()}`)).body.data;
    const hours = s.slots.map((x) => new Date(x.at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }));
    expect(hours[0]).toBe('07:00');
    expect(hours.at(-1)).toBe('20:45'); // 45-min haircut must end by 21:30
    expect((await owner.patch(`/api/v1/settings/branches/${owner.branchId}`, { latitude: 123 })).status).toBe(400);
  });
});

describe('every role can answer booking requests; alert pulse', () => {
  it('a stylist confirms a request; the pulse shows waiting requests and the newest one', async () => {
    const phone = '9555500001';
    await api().post('/api/v1/customer/auth/otp').send({ phone }).then(async (o) => {
      const v = await api().post('/api/v1/customer/auth/verify').send({ phone, code: o.body.data.devCode });
      const t = v.body.data.accessToken;
      await api().patch('/api/v1/customer/me').set('Authorization', `Bearer ${t}`).send({ name: 'Riya' });
      const s = (await api().get(`/api/v1/customer/salons/${slug}/slots?branchId=${owner.branchId}&serviceIds=${shop.haircut.id}&date=${tomorrow()}`)).body.data;
      const b = await api().post('/api/v1/customer/bookings').set('Authorization', `Bearer ${t}`).send({ requestId: crypto.randomUUID(), branchId: owner.branchId, serviceIds: [shop.haircut.id], startsAt: s.slots[3].at });
      expect(b.status).toBe(201);
    });
    const stylist = await addUser(owner.tenantId, 'STYLIST', { allBranches: true });
    const pulse = (await stylist.get('/api/v1/online/pulse')).body.data;
    expect(pulse).toMatchObject({ pendingBookings: 1, newOrders: 0, latestBooking: { customer: 'Riya', service: 'Haircut' } });
    const req = (await stylist.get('/api/v1/online/bookings')).body.data[0];
    const ok = await stylist.post(`/api/v1/online/bookings/${req.id}/confirm`);
    expect(ok.status).toBe(200);
    expect((await stylist.get('/api/v1/online/pulse')).body.data.pendingBookings).toBe(0);
    // the stylist still can't bill
    expect((await stylist.get('/api/v1/online/orders/00000000-0000-4000-8000-000000000000/cart')).status).toBe(403);
  });
});
