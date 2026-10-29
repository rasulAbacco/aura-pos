/**
 * Appointments & chair queue. Double-booking is prevented by a Postgres EXCLUDE constraint
 * (see prisma/sql/constraints.sql); this service translates that into a friendly 409.
 */
import { prisma, isExclusionViolation } from '../../core/database/prisma.js';
import { conflict, notFound, badRequest } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';
import { assertBranchAccess } from '../../core/middleware/auth.middleware.js';
import { zonedToUtc, weekdayKey, DEFAULT_HOURS } from '../../core/utils/time.js';

export const TRANSITIONS = {
  BOOKED: ['CONFIRMED', 'WAITING', 'CHECKED_IN', 'IN_SERVICE', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['WAITING', 'CHECKED_IN', 'IN_SERVICE', 'CANCELLED', 'NO_SHOW'],
  WAITING: ['CHECKED_IN', 'IN_SERVICE', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_SERVICE', 'CANCELLED'],
  IN_SERVICE: ['COMPLETED'],
  COMPLETED: [], CANCELLED: [], NO_SHOW: [],
};
const ACTIVE = ['BOOKED', 'CONFIRMED', 'WAITING', 'CHECKED_IN', 'IN_SERVICE'];

async function loadRefs(ctx, { customerId, staffId, serviceId, resourceId, branchId }) {
  const [customer, staff, service, resource] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, tenantId: ctx.tenantId, archivedAt: null } }),
    prisma.staffProfile.findFirst({ where: { id: staffId, tenantId: ctx.tenantId, status: 'ACTIVE', isBookable: true, archivedAt: null } }),
    prisma.catalogItem.findFirst({ where: { id: serviceId, tenantId: ctx.tenantId, type: 'SERVICE', isActive: true, archivedAt: null } }),
    resourceId ? prisma.resource.findFirst({ where: { id: resourceId, tenantId: ctx.tenantId, branchId, isActive: true } }) : Promise.resolve(null),
  ]);
  if (!customer) throw badRequest('Unknown customer');
  if (!staff) throw badRequest('Staff member is not bookable');
  if (!service) throw badRequest('Unknown or inactive service');
  if (resourceId && !resource) throw badRequest('Unknown chair/room for this branch');
  return { customer, staff, service, resource };
}

function translateOverlap(err) {
  if (isExclusionViolation(err)) {
    const which = /resource/i.test(err.message) ? 'That chair/room' : 'This staff member';
    return conflict('APPOINTMENT_CONFLICT', `${which} is already booked for an overlapping time`);
  }
  return err;
}

async function getAppointment(ctx, id) {
  const a = await prisma.appointment.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!a) throw notFound('Appointment');
  assertBranchAccess(ctx, a.branchId);
  return a;
}

export async function listAppointments(ctx, branchId, { from, to, staffId }) {
  const where = { tenantId: ctx.tenantId, branchId, startsAt: { gte: from, lt: to }, ...(staffId ? { staffId } : {}) };
  // Stylists see only their own schedule.
  if (ctx.role === 'STYLIST') {
    const me = await prisma.staffProfile.findFirst({ where: { tenantId: ctx.tenantId, userId: ctx.userId } });
    where.staffId = me?.id ?? '00000000-0000-0000-0000-000000000000';
  }
  return prisma.appointment.findMany({ where, orderBy: { startsAt: 'asc' }, include: { customer: { select: { id: true, name: true, phone: true } }, staff: { select: { id: true, name: true } }, resource: { select: { id: true, name: true } } } });
}

/** Free start times for a staff member + service on a calendar date (tenant timezone). */
export async function availability(ctx, branch, q) {
  const service = await prisma.catalogItem.findFirst({ where: { id: q.serviceId, tenantId: ctx.tenantId, type: 'SERVICE' } });
  if (!service) throw notFound('Service');
  const tz = ctx.tenant.timezone;
  const windows = (branch.businessHours ?? DEFAULT_HOURS)[weekdayKey(q.date)] ?? [];
  const dayStart = zonedToUtc(q.date, '00:00', tz);
  const busy = await prisma.appointment.findMany({ where: { tenantId: ctx.tenantId, staffId: q.staffId, status: { in: ACTIVE.concat('COMPLETED') }, startsAt: { lt: new Date(dayStart.getTime() + 86400000) }, endsAt: { gt: dayStart } }, select: { startsAt: true, endsAt: true } });
  const dur = (service.durationMin ?? 45) * 60000;
  const now = Date.now();
  const slots = [];
  for (const [open, close] of windows) {
    const openAt = zonedToUtc(q.date, open, tz).getTime(), closeAt = zonedToUtc(q.date, close, tz).getTime();
    for (let t = openAt; t + dur <= closeAt; t += q.stepMin * 60000) {
      if (t < now) continue;
      if (busy.some((b) => t < b.endsAt.getTime() && t + dur > b.startsAt.getTime())) continue;
      slots.push(new Date(t).toISOString());
    }
  }
  return { date: q.date, timezone: tz, durationMin: service.durationMin ?? 45, slots };
}

export async function createAppointment(ctx, branchId, body) {
  const { customer, staff, service } = await loadRefs(ctx, { ...body, branchId });
  const startsAt = body.walkIn ? new Date() : body.startsAt;
  if (!startsAt) throw badRequest('startsAt is required for scheduled bookings');
  if (!body.walkIn && startsAt.getTime() < Date.now() - 5 * 60000) throw badRequest('Cannot book in the past');
  const endsAt = new Date(startsAt.getTime() + (body.durationMin ?? service.durationMin ?? 45) * 60000);
  try {
    return await prisma.$transaction(async (tx) => {
      const a = await tx.appointment.create({ data: {
        tenantId: ctx.tenantId, branchId, customerId: customer.id, staffId: staff.id, resourceId: body.resourceId ?? null,
        serviceId: service.id, serviceName: service.name, startsAt, endsAt, isWalkIn: body.walkIn, status: body.walkIn ? 'WAITING' : 'BOOKED', notes: body.notes,
      } });
      await audit(tx, ctx, 'appointment.create', { entityType: 'Appointment', entityId: a.id });
      return a;
    });
  } catch (err) { throw translateOverlap(err); }
}

export async function changeStatus(ctx, id, { status, reason }) {
  const a = await getAppointment(ctx, id);
  if (!TRANSITIONS[a.status].includes(status)) throw conflict('INVALID_TRANSITION', `Cannot move an appointment from ${a.status} to ${status}`);
  if (status === 'COMPLETED') throw conflict('INVALID_TRANSITION', 'Appointments are completed by checking out at the POS');
  const u = await prisma.appointment.update({ where: { id: a.id }, data: { status, ...(status === 'CANCELLED' ? { cancelReason: reason ?? null } : {}) } });
  await audit(prisma, ctx, 'appointment.status', { entityType: 'Appointment', entityId: a.id, detail: { from: a.status, to: status, reason } });
  return u;
}

export async function reschedule(ctx, id, body) {
  const a = await getAppointment(ctx, id);
  if (!ACTIVE.includes(a.status) || a.status === 'IN_SERVICE') throw conflict('INVALID_TRANSITION', `Cannot reschedule a ${a.status} appointment`);
  if (body.startsAt.getTime() < Date.now() - 5 * 60000) throw badRequest('Cannot move into the past');
  const staffId = body.staffId ?? a.staffId;
  await loadRefs(ctx, { customerId: a.customerId, staffId, serviceId: a.serviceId, resourceId: body.resourceId === undefined ? a.resourceId : body.resourceId, branchId: a.branchId });
  const dur = a.endsAt.getTime() - a.startsAt.getTime();
  try {
    const u = await prisma.appointment.update({ where: { id: a.id }, data: { startsAt: body.startsAt, endsAt: new Date(body.startsAt.getTime() + dur), staffId, ...(body.resourceId !== undefined ? { resourceId: body.resourceId } : {}) } });
    await audit(prisma, ctx, 'appointment.reschedule', { entityType: 'Appointment', entityId: a.id, detail: { from: a.startsAt, to: body.startsAt } });
    return u;
  } catch (err) { throw translateOverlap(err); }
}

/** Appointment → billing: the cart the POS should open (prices are re-read at checkout anyway). */
export async function cartForAppointment(ctx, id) {
  const a = await getAppointment(ctx, id);
  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)) throw conflict('INVALID_TRANSITION', `Appointment is ${a.status}`);
  const svc = await prisma.catalogItem.findFirst({ where: { id: a.serviceId, tenantId: ctx.tenantId } });
  return { appointmentId: a.id, branchId: a.branchId, customerId: a.customerId, lines: [{ type: 'SERVICE', itemId: a.serviceId, quantity: 1, staffId: a.staffId, description: svc?.name ?? a.serviceName, unitPrice: svc?.price }] };
}
