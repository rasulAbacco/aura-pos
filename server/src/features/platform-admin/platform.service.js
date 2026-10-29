/** Platform Super Admin: tenants, plans, payments, webhooks, contact requests, audit. */
import { prisma } from '../../core/database/prisma.js';
import { audit } from '../../core/utils/audit.js';
import { notFound, unauthorized } from '../../core/errors/errors.js';
import { evaluateEntitlement } from '../subscription/subscription.entitlements.js';
import { verifyPassword, verifyAgainstDummy, revokeAllForPrincipal } from '../auth/auth.sessions.js';

export async function checkAdminCredentials({ email, password }, requestId) {
  const admin = await prisma.platformAdmin.findUnique({ where: { email } });
  const valid = admin ? await verifyPassword(admin.passwordHash, password) : await verifyAgainstDummy(password);
  if (!valid || !admin.isActive) throw unauthorized('Incorrect email or password');
  await prisma.platformAdmin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await audit(prisma, { actor: `platform:${admin.id}`, requestId }, 'platform.login');
  return admin;
}

export async function stats() {
  const now = new Date();
  const [tenants, suspended, subs, captured, failedWebhooks, newContacts] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
    prisma.subscription.groupBy({ by: ['status'], _count: true }),
    prisma.paymentTransaction.aggregate({ where: { status: 'CAPTURED', createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } }, _sum: { amount: true }, _count: true }),
    prisma.webhookEvent.count({ where: { status: 'FAILED' } }),
    prisma.contactSubmission.count({ where: { status: 'NEW' } }),
  ]);
  return { tenants, suspended, subscriptionsByStatus: Object.fromEntries(subs.map((s) => [s.status, s._count])), revenueThisMonth: captured._sum.amount ?? '0', paymentsThisMonth: captured._count, failedWebhooks, newContacts };
}

export async function listTenants({ skip, take, q }) {
  const where = q ? { OR: [{ displayName: { contains: q, mode: 'insensitive' } }, { slug: { contains: q } }, { users: { some: { email: { contains: q.toLowerCase() } } } }] } : {};
  const [rows, total] = await Promise.all([
    prisma.tenant.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { subscriptions: { orderBy: { currentPeriodEnd: 'desc' }, take: 1, include: { plan: true } }, _count: { select: { users: true, branches: true } } } }),
    prisma.tenant.count({ where }),
  ]);
  const now = new Date();
  return {
    total,
    rows: rows.map((t) => {
      const sub = t.subscriptions[0];
      const e = evaluateEntitlement({ tenant: t, subscription: sub, plan: sub?.plan, now });
      return { id: t.id, displayName: t.displayName, slug: t.slug, status: t.status, createdAt: t.createdAt, users: t._count.users, branches: t._count.branches, effectiveState: e.state, plan: sub?.plan?.name ?? null, periodEnd: sub?.currentPeriodEnd ?? null };
    }),
  };
}

export async function getTenant(id) {
  const t = await prisma.tenant.findUnique({ where: { id }, include: { branches: true, users: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } }, subscriptions: { include: { plan: true, events: { orderBy: { createdAt: 'desc' }, take: 50 } } }, payments: { orderBy: { createdAt: 'desc' }, take: 50 } } });
  if (!t) throw notFound('Tenant');
  return t;
}

export async function suspendTenant(ctx, id, reason) {
  const t = await prisma.tenant.update({ where: { id }, data: { status: 'SUSPENDED', suspendedReason: reason, suspendedAt: new Date() } });
  const users = await prisma.user.findMany({ where: { tenantId: t.id }, select: { id: true } });
  await Promise.all(users.map((u) => revokeAllForPrincipal('user', u.id, 'TENANT_SUSPENDED'))); // kick out live sessions
  await audit(prisma, { tenantId: t.id, actor: ctx.actor, requestId: ctx.requestId }, 'platform.tenant_suspended', { entityType: 'Tenant', entityId: t.id, detail: { reason } });
  return { id: t.id, status: t.status };
}

export async function reactivateTenant(ctx, id, reason) {
  const t = await prisma.tenant.update({ where: { id }, data: { status: 'ACTIVE', suspendedReason: null, suspendedAt: null } });
  await audit(prisma, { tenantId: t.id, actor: ctx.actor, requestId: ctx.requestId }, 'platform.tenant_reactivated', { entityType: 'Tenant', entityId: t.id, detail: { reason } });
  return { id: t.id, status: t.status };
}

export const listPlans = () => prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } });

export async function createPlan(ctx, data) {
  const plan = await prisma.subscriptionPlan.create({ data: { ...data, price: data.price.toFixed(2) } });
  await audit(prisma, { actor: ctx.actor, requestId: ctx.requestId }, 'platform.plan_created', { entityType: 'SubscriptionPlan', entityId: plan.id, detail: data });
  return plan;
}

export async function updatePlan(ctx, id, data) {
  const plan = await prisma.subscriptionPlan.update({ where: { id }, data: { ...data, ...(data.price !== undefined ? { price: data.price.toFixed(2) } : {}) } });
  await audit(prisma, { actor: ctx.actor, requestId: ctx.requestId }, 'platform.plan_updated', { entityType: 'SubscriptionPlan', entityId: plan.id, detail: data });
  return plan;
}

export async function listPayments({ skip, take }) {
  const [rows, total] = await Promise.all([
    prisma.paymentTransaction.findMany({ skip, take, orderBy: { createdAt: 'desc' }, include: { tenant: { select: { displayName: true } }, plan: { select: { name: true } } } }),
    prisma.paymentTransaction.count(),
  ]);
  return { rows, total };
}

export const listWebhooks = (status) => prisma.webhookEvent.findMany({ where: status ? { status } : {}, orderBy: { receivedAt: 'desc' }, take: 100, select: { id: true, eventId: true, eventType: true, status: true, error: true, attempts: true, receivedAt: true, processedAt: true } });
export const listContacts = () => prisma.contactSubmission.findMany({ where: { status: { not: 'SPAM' } }, orderBy: { createdAt: 'desc' }, take: 200 });
export const setContactStatus = (id, status) => prisma.contactSubmission.update({ where: { id }, data: { status } });

export async function listAudit({ skip, take, tenantId }) {
  const where = tenantId ? { tenantId } : {};
  const [rows, total] = await Promise.all([prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }), prisma.auditLog.count({ where })]);
  return { rows, total };
}
