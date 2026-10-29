import { describe, it, expect, beforeAll } from 'vitest';
import { prisma, outbox, resetDb, seedPlans, registerSalon, buildShop, setSubscription } from '../helpers/helpers.js';
import { runRenewalReminders } from '../../src/jobs/renewalReminders.job.js';
import { runLowStockAlerts } from '../../src/jobs/lowStockAlerts.job.js';

beforeAll(async () => { await resetDb(); await seedPlans(); });

describe('scheduled jobs', () => {
  it('renewal reminder goes out once per period end, never twice (restart-safe)', async () => {
    const s = await registerSalon('Reminder Salon');
    await setSubscription(s.tenantId, 'starter', { endsInDays: 5 });
    const before = outbox.length;
    expect((await runRenewalReminders()).sent).toBe(1);
    expect((await runRenewalReminders()).sent).toBe(0); // second run: deduplicated
    const mails = outbox.slice(before).filter((m) => m.to === s.email);
    expect(mails).toHaveLength(1);
    expect(mails[0].subject).toMatch(/Starter plan renews or ends/);
    expect(await prisma.notification.count({ where: { tenantId: s.tenantId, status: 'SENT' } })).toBe(1);
  });

  it('skips cancelling subscriptions and trials more than 3 days from ending', async () => {
    const a = await registerSalon('Cancelling Salon');
    await setSubscription(a.tenantId, 'starter', { endsInDays: 5, cancelAtPeriodEnd: true });
    const b = await registerSalon('Long Trial Salon'); // fresh 14-day trial
    await runRenewalReminders();
    expect(await prisma.notification.count({ where: { tenantId: { in: [a.tenantId, b.tenantId] } } })).toBe(0);
  });

  it('low-stock alert lists products at or below reorder level, once per day', async () => {
    const s = await registerSalon('Stock Salon');
    const shop = await buildShop(s); // shampoo: 5 in stock, reorder at 2
    await s.post('/api/v1/inventory/adjustments', { itemId: shop.shampoo.id, delta: -3, type: 'DAMAGE', note: 'Leaked in storage' }).expect(200);
    const before = outbox.length;
    expect((await runLowStockAlerts()).sent).toBeGreaterThanOrEqual(1);
    await runLowStockAlerts();
    const mails = outbox.slice(before).filter((m) => m.to === s.email);
    expect(mails).toHaveLength(1);
    expect(mails[0].text).toContain('Shampoo: 2 left (reorder at 2)');
  });
});
