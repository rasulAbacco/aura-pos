/**
 * Client membership plans (what the salon sells to its clients — not the salon's own
 * SaaS subscription). Enrolment happens at the POS by selling a MEMBERSHIP line.
 */
import { prisma, isUniqueViolation } from '../../core/database/prisma.js';
import { conflict, notFound } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';

export const listPlans = (ctx, all) => prisma.membershipPlan.findMany({ where: { tenantId: ctx.tenantId, ...(all ? {} : { isActive: true }) }, orderBy: { price: 'asc' } });

export async function createPlan(ctx, data) {
  try {
    const p = await prisma.membershipPlan.create({ data: { ...data, tenantId: ctx.tenantId } });
    await audit(prisma, ctx, 'membership_plan.create', { entityType: 'MembershipPlan', entityId: p.id });
    return p;
  } catch (e) { if (isUniqueViolation(e)) throw conflict('DUPLICATE', 'A plan with this name exists'); throw e; }
}

/** Existing enrolments keep their benefits; changes apply to future sales. */
export async function updatePlan(ctx, id, data) {
  const p = await prisma.membershipPlan.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!p) throw notFound('Membership plan');
  const u = await prisma.membershipPlan.update({ where: { id: p.id }, data });
  await audit(prisma, ctx, 'membership_plan.update', { entityType: 'MembershipPlan', entityId: p.id, detail: data });
  return u;
}

export const activeMembers = (ctx) => prisma.customerMembership.findMany({
  where: { tenantId: ctx.tenantId, status: 'ACTIVE', endsAt: { gt: new Date() } },
  include: { plan: { select: { name: true, discountPercent: true } }, customer: { select: { id: true, name: true, phone: true, walletBalance: true } } },
  orderBy: { endsAt: 'asc' },
});

export async function cancelMembership(ctx, id, reason) {
  const { count } = await prisma.customerMembership.updateMany({ where: { id, tenantId: ctx.tenantId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
  if (!count) throw notFound('Active membership');
  await audit(prisma, ctx, 'membership.cancel', { entityType: 'CustomerMembership', entityId: id, detail: { reason } });
}
