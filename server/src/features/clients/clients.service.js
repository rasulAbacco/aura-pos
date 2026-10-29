/**
 * Client CRM. Colour formulas and allergies are sensitive: callers without
 * `customers.sensitive` see "[restricted]" and cannot write them.
 */
import { prisma, isUniqueViolation } from '../../core/database/prisma.js';
import { conflict, notFound, forbidden } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';
import { walletChange } from './clients.wallet.js';

const SENSITIVE = ['colorFormula', 'allergies'];

export function present(ctx, c) {
  const { tenantId, ...rest } = c;
  if (!ctx.permissions.has('customers.sensitive')) for (const k of SENSITIVE) if (k in rest) rest[k] = rest[k] ? '[restricted]' : null;
  return rest;
}
export function stripSensitive(ctx, data) {
  if (!ctx.permissions.has('customers.sensitive')) for (const k of SENSITIVE) delete data[k];
  return data;
}

export async function getCustomer(ctx, id) {
  const c = await prisma.customer.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!c) throw notFound('Customer');
  return c;
}

export async function listClients(ctx, { skip, take, q }) {
  const now = new Date();
  const where = {
    tenantId: ctx.tenantId, archivedAt: null,
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q.replace(/[\s-]/g, '') } }, { email: { contains: q, mode: 'insensitive' } }, { memberships: { some: { status: 'ACTIVE', endsAt: { gt: now }, plan: { name: { contains: q, mode: 'insensitive' } } } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take, orderBy: { name: 'asc' }, include: { memberships: { where: { status: 'ACTIVE', endsAt: { gt: now } }, include: { plan: { select: { id: true, name: true, discountPercent: true } } }, orderBy: { endsAt: 'desc' }, take: 1 } } }),
    prisma.customer.count({ where }),
  ]);
  return {
    total,
    rows: rows.map(({ memberships, ...c }) => ({
      ...present(ctx, c),
      activeMembership: memberships[0] ? { planId: memberships[0].plan.id, planName: memberships[0].plan.name, discountPercent: memberships[0].plan.discountPercent.toString(), endsAt: memberships[0].endsAt } : null,
    })),
  };
}

export async function createClient(ctx, body) {
  try {
    const c = await prisma.customer.create({ data: { ...stripSensitive(ctx, body), tenantId: ctx.tenantId } });
    await audit(prisma, ctx, 'customer.create', { entityType: 'Customer', entityId: c.id });
    return present(ctx, c);
  } catch (e) {
    if (isUniqueViolation(e)) {
      const existing = await prisma.customer.findFirst({ where: { tenantId: ctx.tenantId, phone: body.phone }, select: { id: true, name: true } });
      throw conflict('DUPLICATE_CUSTOMER', `A customer with this phone already exists (${existing?.name})`, { existingId: existing?.id });
    }
    throw e;
  }
}

export async function clientProfile(ctx, id) {
  const c = await getCustomer(ctx, id);
  const now = new Date();
  const [memberships, patchTests, recentInvoices, upcomingAppointments] = await Promise.all([
    prisma.customerMembership.findMany({ where: { tenantId: ctx.tenantId, customerId: c.id }, include: { plan: { select: { name: true, discountPercent: true } } }, orderBy: { endsAt: 'desc' } }),
    ctx.permissions.has('customers.sensitive') ? prisma.patchTest.findMany({ where: { tenantId: ctx.tenantId, customerId: c.id }, orderBy: { testedAt: 'desc' } }) : Promise.resolve(null),
    prisma.invoice.findMany({ where: { tenantId: ctx.tenantId, customerId: c.id }, orderBy: { issuedAt: 'desc' }, take: 20, select: { id: true, number: true, kind: true, issuedAt: true, grandTotal: true, status: true } }),
    prisma.appointment.findMany({ where: { tenantId: ctx.tenantId, customerId: c.id, startsAt: { gte: now } }, orderBy: { startsAt: 'asc' }, take: 10, select: { id: true, serviceName: true, startsAt: true, status: true } }),
  ]);
  return { ...present(ctx, c), memberships, patchTests, recentInvoices, upcomingAppointments };
}

export async function updateClient(ctx, id, data) {
  const c = await getCustomer(ctx, id);
  stripSensitive(ctx, data);
  try {
    const u = await prisma.customer.update({ where: { id: c.id }, data });
    await audit(prisma, ctx, 'customer.update', { entityType: 'Customer', entityId: c.id, detail: { fields: Object.keys(data) } });
    return present(ctx, u);
  } catch (e) { if (isUniqueViolation(e)) throw conflict('DUPLICATE_CUSTOMER', 'Another customer already uses this phone'); throw e; }
}

/**
 * Right to erasure: scrub profile PII and sensitive notes. Issued invoices keep their
 * customer snapshot because tax law requires retaining invoices (see docs/05-security.md).
 */
export async function anonymize(ctx, id) {
  if (ctx.role !== 'OWNER') throw forbidden('Only the owner can erase customer data');
  const c = await getCustomer(ctx, id);
  if (!c.walletBalance.isZero()) throw conflict('WALLET_NOT_EMPTY', 'Refund or settle the wallet balance before erasing this customer');
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({ where: { id: c.id }, data: { name: 'Erased customer', phone: `erased-${c.id}`, email: null, birthday: null, gender: null, notes: null, colorFormula: null, allergies: null, marketingConsent: false, whatsappConsent: false, archivedAt: new Date() } });
    await tx.patchTest.deleteMany({ where: { tenantId: ctx.tenantId, customerId: c.id } });
    await audit(tx, ctx, 'customer.anonymize', { entityType: 'Customer', entityId: c.id });
  });
}

export async function walletLedger(ctx, id) {
  const c = await getCustomer(ctx, id);
  const entries = await prisma.walletEntry.findMany({ where: { tenantId: ctx.tenantId, customerId: c.id }, orderBy: { createdAt: 'desc' }, take: 200 });
  return { balance: c.walletBalance, entries };
}

/** Manual wallet credit/debit — always a ledger entry with a reason, never a direct balance edit. */
export async function adjustWallet(ctx, id, body) {
  const c = await getCustomer(ctx, id);
  return prisma.$transaction(async (tx) => {
    const e = await walletChange(tx, { tenantId: ctx.tenantId, customerId: c.id, amount: body.amount, type: body.type, reason: body.reason, actorUserId: ctx.userId });
    await audit(tx, ctx, 'wallet.adjust', { entityType: 'Customer', entityId: c.id, detail: body });
    return e;
  });
}

export async function addPatchTest(ctx, id, body) {
  const c = await getCustomer(ctx, id);
  return prisma.patchTest.create({ data: { ...body, tenantId: ctx.tenantId, customerId: c.id, actorUserId: ctx.userId } });
}
