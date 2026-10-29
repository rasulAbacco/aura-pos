import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  api, prisma, resetDb, seedPlans, registerSalon, buildShop, setSubscription, startRazorpayStub,
  checkoutSignature, webhookSignature, client,
} from '../helpers/helpers.js';
import { hashPassword } from '../../src/features/auth/auth.sessions.js';

let A, B, shopA, plans, stub;

beforeAll(async () => {
  await resetDb();
  plans = await seedPlans();
  stub = await startRazorpayStub();
  A = await registerSalon('Tenant A');
  B = await registerSalon('Tenant B');
  shopA = await buildShop(A);
  await buildShop(B);
});
afterAll(async () => { await stub.close(); });

describe('tenant isolation', () => {
  it('another tenant cannot read A’s records by id (404, not 403 — no existence leak)', async () => {
    const inv = (await A.checkout({ customerId: shopA.customer.id, lines: [{ type: 'SERVICE', itemId: shopA.haircut.id, quantity: 1 }], payments: [{ method: 'CASH', amount: 1121 }] })).body.data;
    for (const url of [`/api/v1/clients/${shopA.customer.id}`, `/api/v1/invoices/${inv.id}`, `/api/v1/staff/${shopA.staff.id}`, `/api/v1/clients/${shopA.customer.id}/wallet`]) {
      const r = await B.get(url);
      expect(r.status, url).toBe(404);
    }
    const list = (await B.get('/api/v1/clients?q=Pooja')).body.data;
    expect(list.every((c) => c.id !== shopA.customer.id)).toBe(true);
  });

  it('another tenant cannot write to A’s records or bill A’s items', async () => {
    expect((await B.patch(`/api/v1/clients/${shopA.customer.id}`, { name: 'Hacked' })).status).toBe(404);
    expect((await B.patch(`/api/v1/catalog/items/${shopA.haircut.id}`, { price: 1 })).status).toBe(404);
    expect((await B.post(`/api/v1/clients/${shopA.customer.id}/wallet/adjust`, { amount: 5000, type: 'TOPUP', reason: 'free money please' })).status).toBe(404);
    const r = await B.checkout({ lines: [{ type: 'SERVICE', itemId: shopA.haircut.id, quantity: 1 }], payments: [{ method: 'CASH', amount: 1121 }] });
    expect(r.status).toBe(400);
    expect((await prisma.customer.findUnique({ where: { id: shopA.customer.id } })).name).toBe('Pooja');
  });

  it('cannot select another tenant’s branch via header', async () => {
    const r = await B.get('/api/v1/catalog/items').set('X-Branch-Id', A.branchId);
    expect(r.status).toBe(404);
  });

  it('tenantId in the body is ignored (mass-assignment safe)', async () => {
    const r = await B.post('/api/v1/clients', { name: 'Injected', phone: '+919811111111', tenantId: A.tenantId });
    expect(r.status).toBe(201);
    expect((await prisma.customer.findUnique({ where: { id: r.body.data.id } })).tenantId).toBe(B.tenantId);
  });

  it('malformed ids return 404, not 500', async () => {
    expect((await A.get('/api/v1/clients/not-a-uuid')).status).toBe(404);
  });
});

describe('subscription enforcement (server-side, per request)', () => {
  let S, shop;
  const sale = () => S.checkout({ lines: [{ type: 'SERVICE', itemId: shop.haircut.id, quantity: 1 }], payments: [{ method: 'CASH', amount: 1121 }] });

  beforeAll(async () => { S = await registerSalon('Sub Salon'); shop = await buildShop(S); });

  it('grace period still allows billing', async () => {
    await setSubscription(S.tenantId, 'starter', { endsInDays: -1 });
    expect((await S.get('/api/v1/auth/me')).body.data.entitlement.state).toBe('GRACE');
    expect((await sale()).status).toBe(201);
  });

  it('expired: writes blocked with 402 on the SAME access token; reads, billing and exports still work', async () => {
    await setSubscription(S.tenantId, 'starter', { endsInDays: -10 });
    const r = await sale();
    expect(r.status).toBe(402);
    expect(r.body.error.code).toBe('SUBSCRIPTION_INACTIVE');
    expect((await S.post('/api/v1/clients', { name: 'New', phone: '+919822222222' })).status).toBe(402);
    expect((await S.post('/api/v1/expenses', { title: 'Rent', category: 'RENT', amount: 100, spentOn: '2026-10-01', paymentMode: 'UPI' })).status).toBe(402);
    expect((await S.get('/api/v1/invoices')).status).toBe(200);
    expect((await S.get('/api/v1/clients')).status).toBe(200);
    expect((await S.get('/api/v1/billing/status')).body.data.entitlement.state).toBe('EXPIRED');
    expect((await S.get('/api/v1/reports/export/invoices.csv')).status).toBe(200);
  });

  it('verified renewal restores access; invalid signatures are rejected', async () => {
    const order = await S.post('/api/v1/billing/orders', { planId: plans.starter.id });
    expect(order.status).toBe(201);
    expect(order.body.data).toMatchObject({ amountPaise: 99900, currency: 'INR', keyId: 'rzp_test_dummykey' });
    expect(JSON.stringify(order.body)).not.toContain('rzp_test_dummy_secret');
    const orderId = order.body.data.orderId;

    const bad = await S.post('/api/v1/billing/verify', { razorpay_order_id: orderId, razorpay_payment_id: 'pay_x', razorpay_signature: 'a'.repeat(64) });
    expect(bad.body.error.code).toBe('PAYMENT_SIGNATURE_INVALID');
    expect((await sale()).status).toBe(402);

    const good = await S.post('/api/v1/billing/verify', { razorpay_order_id: orderId, razorpay_payment_id: 'pay_good1', razorpay_signature: checkoutSignature(orderId, 'pay_good1') });
    expect(good.body.data.applied).toBe(true);
    expect((await sale()).status).toBe(201);
    const st = (await S.get('/api/v1/billing/status')).body.data;
    expect(st.entitlement.state).toBe('ACTIVE');

    // The webhook for the same payment arriving later is a no-op (no double extension).
    const end1 = (await prisma.subscription.findFirst({ where: { tenantId: S.tenantId } })).currentPeriodEnd;
    const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_good1', order_id: orderId, amount: 99900, currency: 'INR' } } } });
    const wh = await api().post('/api/v1/webhooks/razorpay').set('Content-Type', 'application/json').set('X-Razorpay-Signature', webhookSignature(raw)).set('X-Razorpay-Event-Id', 'evt_1').send(raw);
    expect(wh.status).toBe(200);
    const end2 = (await prisma.subscription.findFirst({ where: { tenantId: S.tenantId } })).currentPeriodEnd;
    expect(end2.toISOString()).toBe(end1.toISOString());
  });

  it('webhook can activate on its own, is idempotent on redelivery, and rejects bad signatures / amounts', async () => {
    await setSubscription(S.tenantId, 'starter', { endsInDays: -10 });
    const orderId = (await S.post('/api/v1/billing/orders', { planId: plans.starter.id })).body.data.orderId;

    const wrongAmt = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_wa', order_id: orderId, amount: 100, currency: 'INR' } } } });
    await api().post('/api/v1/webhooks/razorpay').set('Content-Type', 'application/json').set('X-Razorpay-Signature', webhookSignature(wrongAmt)).set('X-Razorpay-Event-Id', 'evt_wa').send(wrongAmt);
    expect((await sale()).status).toBe(402);

    const raw = JSON.stringify({ event: 'order.paid', payload: { payment: { entity: { id: 'pay_wh', order_id: orderId, amount: 99900, currency: 'INR' } } } });
    const forged = await api().post('/api/v1/webhooks/razorpay').set('Content-Type', 'application/json').set('X-Razorpay-Signature', webhookSignature(raw + ' ')).send(raw);
    expect(forged.status).toBe(400);

    const send = () => api().post('/api/v1/webhooks/razorpay').set('Content-Type', 'application/json').set('X-Razorpay-Signature', webhookSignature(raw)).set('X-Razorpay-Event-Id', 'evt_2').send(raw);
    expect((await send()).body.data.status).toBe('PROCESSED');
    const end1 = (await prisma.subscription.findFirst({ where: { tenantId: S.tenantId } })).currentPeriodEnd;
    expect((await send()).body.data.duplicate).toBe(true);
    const end2 = (await prisma.subscription.findFirst({ where: { tenantId: S.tenantId } })).currentPeriodEnd;
    expect(end2.toISOString()).toBe(end1.toISOString());
    expect((await sale()).status).toBe(201);
    expect(await prisma.webhookEvent.count({ where: { eventId: 'evt_2' } })).toBe(1);
  });

  it('platform suspension blocks everything except billing view, and a payment does not lift it', async () => {
    await setSubscription(S.tenantId, 'starter', { endsInDays: 20 });
    await prisma.platformAdmin.create({ data: { email: 'ops@aura.test', name: 'Ops', passwordHash: await hashPassword('platform-password-2') } });
    const admin = client((await api().post('/api/v1/platform/auth/login').send({ email: 'ops@aura.test', password: 'platform-password-2' })).body.data.accessToken);
    expect((await admin.post(`/api/v1/platform/tenants/${S.tenantId}/suspend`, { reason: 'Chargeback investigation' })).status).toBe(200);

    // Existing sessions were revoked; log in again to prove the block is state-based, not just session-based.
    expect((await S.get('/api/v1/clients')).status).toBe(401);
    const S2 = client((await api().post('/api/v1/auth/login').send({ email: S.email, password: 'correct-horse-battery' })).body.data.accessToken);
    expect((await S2.get('/api/v1/clients')).status).toBe(423);
    expect((await S2.get('/api/v1/billing/status')).status).toBe(200);
    expect((await S2.post('/api/v1/billing/orders', { planId: plans.starter.id })).status).toBe(423);

    // Even a verified payment for an older order does not unsuspend.
    const ptx = await prisma.paymentTransaction.create({ data: { tenantId: S.tenantId, planId: plans.starter.id, providerOrderId: 'order_susp', amount: '999.00', amountPaise: 99900 } });
    await S2.post('/api/v1/billing/verify', { razorpay_order_id: 'order_susp', razorpay_payment_id: 'pay_susp', razorpay_signature: checkoutSignature('order_susp', 'pay_susp') });
    expect((await prisma.tenant.findUnique({ where: { id: S.tenantId } })).status).toBe('SUSPENDED');
    expect((await S2.get('/api/v1/clients')).status).toBe(423);
    expect(ptx.id).toBeTruthy();

    await admin.post(`/api/v1/platform/tenants/${S.tenantId}/reactivate`, { reason: 'Investigation closed' }).expect(200);
    expect((await S2.get('/api/v1/clients')).status).toBe(200);
    expect(await prisma.auditLog.count({ where: { tenantId: S.tenantId, action: { in: ['platform.tenant_suspended', 'platform.tenant_reactivated'] } } })).toBe(2);
  });

  it('cannot pay for a plan before verifying email', async () => {
    const U = await registerSalon('Unverified', { verify: false });
    expect((await U.post('/api/v1/billing/orders', { planId: plans.starter.id })).body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

describe('plan quotas and features', () => {
  it('enforces the staff limit and feature gates on the server', async () => {
    const Q = await registerSalon('Quota Salon');
    await setSubscription(Q.tenantId, 'starter'); // maxStaff 3, no multibranch
    for (let i = 0; i < 3; i++) expect((await Q.post('/api/v1/staff', { name: `Staff ${i}`, designation: 'Stylist', phone: `+91980000000${i}` })).status).toBe(201);
    const over = await Q.post('/api/v1/staff', { name: 'One Too Many', designation: 'Stylist', phone: '+919800000009' });
    expect(over.body.error.code).toBe('PLAN_LIMIT_STAFF');
    const branch = await Q.post('/api/v1/settings/branches', { name: 'Second', code: 'SEC' });
    expect(branch.body.error.code).toBe('PLAN_LIMIT_BRANCHES');
    const t = await Q.post('/api/v1/inventory/transfers', { itemId: crypto.randomUUID(), quantity: 1, fromBranchId: Q.branchId, toBranchId: crypto.randomUUID() });
    expect(t.body.error.code).toBe('PLAN_FEATURE_UNAVAILABLE');
    // A downgrade that would not fit current usage is refused before any payment is taken.
    await setSubscription(Q.tenantId, 'business');
    await Q.post('/api/v1/staff', { name: 'Fourth', designation: 'Stylist', phone: '+919800000008' }).expect(201);
    expect((await Q.post('/api/v1/billing/orders', { planId: plans.starter.id })).body.error.code).toBe('PLAN_TOO_SMALL');
  });
});
