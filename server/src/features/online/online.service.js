/**
 * The salon's side of the customer app: booking requests and click-and-collect orders.
 *
 * Booking requests are appointments with source APP. BOOKED = waiting for the salon; the salon confirms
 * (CONFIRMED) or declines (CANCELLED with a reason the customer sees). Services booked together share a
 * bookingGroup and are confirmed/declined together.
 *
 * Orders: PLACED → CONFIRMED → READY → COLLECTED (by billing it at the counter) or CANCELLED.
 * Opening an order at the counter loads it as a normal bill; checkout re-prices it, takes stock and
 * marks the order COLLECTED in the same transaction.
 */
import { prisma } from '../../core/database/prisma.js';
import { conflict, notFound } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';
import { assertBranchAccess } from '../../core/middleware/auth.middleware.js';
import { zonedToUtc, zonedDateString } from '../../core/utils/time.js';

const OPEN_ORDER = ['PLACED', 'CONFIRMED', 'READY'];
const money = (d) => (d == null ? null : Number(d).toFixed(2));
const DAY = 86400000;

function todayRange(tz) {
  const d = zonedDateString(new Date(), tz);
  const start = zonedToUtc(d, '00:00', tz);
  return [start, new Date(start.getTime() + DAY)];
}

/** Numbers for the dashboard card and the Online page header. */
export async function summary(ctx, branch) {
  const tz = ctx.tenant.timezone;
  const [dayStart, dayEnd] = todayRange(tz);
  const since = new Date(Date.now() - 30 * DAY);
  const base = { tenantId: ctx.tenantId, branchId: branch.id, source: 'APP' };
  const [pending, today, upcoming, last30, orders, orders30] = await Promise.all([
    prisma.appointment.findMany({ where: { ...base, status: 'BOOKED', startsAt: { gt: new Date() } }, select: { id: true, bookingGroup: true } }),
    prisma.appointment.findMany({ where: { ...base, status: { notIn: ['CANCELLED'] }, startsAt: { gte: dayStart, lt: dayEnd } }, select: { id: true, bookingGroup: true } }),
    prisma.appointment.findMany({ where: { ...base, status: 'CONFIRMED', startsAt: { gt: new Date() } }, select: { id: true, bookingGroup: true } }),
    prisma.appointment.findMany({ where: { ...base, createdAt: { gte: since } }, select: { id: true, bookingGroup: true, status: true, cancelReason: true } }),
    prisma.shopOrder.groupBy({ by: ['status'], where: { tenantId: ctx.tenantId, branchId: branch.id, status: { in: OPEN_ORDER } }, _count: { _all: true } }),
    prisma.shopOrder.findMany({ where: { tenantId: ctx.tenantId, branchId: branch.id, createdAt: { gte: since } }, select: { status: true, itemsTotal: true } }),
  ]);
  const groups = (rows) => new Set(rows.map((a) => a.bookingGroup ?? a.id)).size;
  const byGroup = new Map();
  for (const a of last30) byGroup.set(a.bookingGroup ?? a.id, a);
  const g30 = [...byGroup.values()];
  const count = (s) => orders.find((o) => o.status === s)?._count._all ?? 0;
  return {
    bookings: {
      pending: groups(pending),
      today: groups(today),
      upcomingConfirmed: groups(upcoming),
      last30: {
        requests: g30.length,
        completed: g30.filter((a) => a.status === 'COMPLETED').length,
        declined: g30.filter((a) => a.status === 'CANCELLED' && /^Declined/.test(a.cancelReason ?? '')).length,
        cancelledByCustomer: g30.filter((a) => a.status === 'CANCELLED' && /^Cancelled by customer/.test(a.cancelReason ?? '')).length,
        noShow: g30.filter((a) => a.status === 'NO_SHOW').length,
      },
    },
    orders: {
      new: count('PLACED'), confirmed: count('CONFIRMED'), ready: count('READY'),
      open: count('PLACED') + count('CONFIRMED') + count('READY'),
      last30: {
        placed: orders30.length,
        collected: orders30.filter((o) => o.status === 'COLLECTED').length,
        cancelled: orders30.filter((o) => o.status === 'CANCELLED').length,
        collectedValue: money(orders30.filter((o) => o.status === 'COLLECTED').reduce((s, o) => s + Number(o.itemsTotal), 0)),
      },
    },
  };
}

/**
 * What the alert needs: requests waiting and the newest one (the app rings when `latestAt` moves on).
 */
export async function pulse(ctx, branch) {
  const [pendingRows, newOrders, lastBooking, lastOrder] = await Promise.all([
    prisma.appointment.findMany({ where: { tenantId: ctx.tenantId, branchId: branch.id, source: 'APP', status: 'BOOKED', startsAt: { gt: new Date() } }, select: { id: true, bookingGroup: true } }),
    prisma.shopOrder.count({ where: { tenantId: ctx.tenantId, branchId: branch.id, status: 'PLACED' } }),
    prisma.appointment.findFirst({ where: { tenantId: ctx.tenantId, branchId: branch.id, source: 'APP', status: 'BOOKED' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true, serviceName: true, startsAt: true, customer: { select: { name: true } } } }),
    prisma.shopOrder.findFirst({ where: { tenantId: ctx.tenantId, branchId: branch.id, status: 'PLACED' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true, number: true, customer: { select: { name: true } } } }),
  ]);
  return {
    pendingBookings: new Set(pendingRows.map((a) => a.bookingGroup ?? a.id)).size,
    newOrders,
    latestBooking: lastBooking ? { at: lastBooking.createdAt, customer: lastBooking.customer.name, service: lastBooking.serviceName, startsAt: lastBooking.startsAt } : null,
    latestOrder: lastOrder ? { at: lastOrder.createdAt, customer: lastOrder.customer.name, number: lastOrder.number } : null,
  };
}

// ─────────────────────────────── Booking requests ───────────────────────────────

const apptInclude = { customer: { select: { id: true, name: true, phone: true, visitCount: true } }, staff: { select: { id: true, name: true } } };

function toRequests(appts) {
  const groups = new Map();
  for (const a of appts) {
    const k = a.bookingGroup ?? a.id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(a);
  }
  return [...groups.entries()].map(([id, list]) => {
    list.sort((x, y) => x.startsAt - y.startsAt);
    const live = list.filter((a) => a.status !== 'CANCELLED');
    return {
      id, status: live[0]?.status ?? 'CANCELLED',
      firstAppointmentId: list[0].id,
      customer: list[0].customer, staff: list[0].staff,
      startsAt: list[0].startsAt, endsAt: list.at(-1).endsAt,
      services: list.map((a) => ({ id: a.id, name: a.serviceName, startsAt: a.startsAt, endsAt: a.endsAt, status: a.status })),
      notes: list[0].notes, cancelReason: list.find((a) => a.cancelReason)?.cancelReason ?? null,
      requestedAt: list[0].createdAt,
    };
  });
}

export async function listBookings(ctx, branch, view) {
  const now = new Date();
  const where = { tenantId: ctx.tenantId, branchId: branch.id, source: 'APP' };
  if (view === 'pending') Object.assign(where, { status: 'BOOKED', startsAt: { gt: now } });
  else if (view === 'upcoming') Object.assign(where, { status: { in: ['BOOKED', 'CONFIRMED', 'WAITING', 'CHECKED_IN', 'IN_SERVICE'] }, startsAt: { gt: new Date(now.getTime() - DAY) } });
  else Object.assign(where, { createdAt: { gt: new Date(now.getTime() - 90 * DAY) } });
  const appts = await prisma.appointment.findMany({ where, orderBy: { startsAt: view === 'all' ? 'desc' : 'asc' }, take: 300, include: apptInclude });
  const out = toRequests(appts);
  return view === 'all' ? out.sort((a, b) => b.requestedAt - a.requestedAt) : out;
}

async function groupFor(ctx, id) {
  const appts = await prisma.appointment.findMany({ where: { tenantId: ctx.tenantId, source: 'APP', OR: [{ bookingGroup: id }, { id }] }, include: apptInclude });
  if (!appts.length) throw notFound('Booking request');
  assertBranchAccess(ctx, appts[0].branchId);
  return appts;
}

export async function confirmBooking(ctx, id) {
  const appts = await groupFor(ctx, id);
  const { count } = await prisma.appointment.updateMany({ where: { id: { in: appts.map((a) => a.id) }, status: 'BOOKED' }, data: { status: 'CONFIRMED' } });
  if (!count) throw conflict('INVALID_TRANSITION', `This booking is already ${appts[0].status.toLowerCase()}`);
  await audit(prisma, ctx, 'appointment.app_confirm', { entityType: 'Appointment', entityId: appts[0].id });
  return toRequests(await groupFor(ctx, id))[0];
}

export async function declineBooking(ctx, id, reason) {
  const appts = await groupFor(ctx, id);
  const { count } = await prisma.appointment.updateMany({ where: { id: { in: appts.map((a) => a.id) }, status: { in: ['BOOKED', 'CONFIRMED'] } }, data: { status: 'CANCELLED', cancelReason: `Declined by salon${reason ? `: ${reason}` : ''}` } });
  if (!count) throw conflict('INVALID_TRANSITION', `This booking is already ${appts[0].status.toLowerCase()}`);
  await audit(prisma, ctx, 'appointment.app_decline', { entityType: 'Appointment', entityId: appts[0].id, detail: { reason } });
  return toRequests(await groupFor(ctx, id))[0];
}

// ─────────────────────────────── Orders ───────────────────────────────

const orderInclude = { lines: true, customer: { select: { id: true, name: true, phone: true } } };
const orderView = (o) => ({
  id: o.id, number: o.number, status: o.status, itemsTotal: money(o.itemsTotal), notes: o.notes,
  cancelReason: o.cancelReason, cancelledBy: o.cancelledBy, invoiceId: o.invoiceId, customer: o.customer,
  createdAt: o.createdAt, updatedAt: o.updatedAt,
  lines: o.lines.map((l) => ({ itemId: l.itemId, name: l.name, unitPrice: money(l.unitPrice), quantity: l.quantity })),
});

export async function listOrders(ctx, branch, view) {
  const where = { tenantId: ctx.tenantId, branchId: branch.id };
  if (view === 'open') where.status = { in: OPEN_ORDER };
  else where.createdAt = { gt: new Date(Date.now() - 90 * DAY) };
  const rows = await prisma.shopOrder.findMany({ where, orderBy: { createdAt: view === 'open' ? 'asc' : 'desc' }, take: 300, include: orderInclude });
  return rows.map(orderView);
}

async function getOrder(ctx, id) {
  const o = await prisma.shopOrder.findFirst({ where: { id, tenantId: ctx.tenantId }, include: orderInclude });
  if (!o) throw notFound('Order');
  assertBranchAccess(ctx, o.branchId);
  return o;
}

const NEXT = { PLACED: ['CONFIRMED', 'READY', 'CANCELLED'], CONFIRMED: ['READY', 'CANCELLED'], READY: ['CANCELLED'], COLLECTED: [], CANCELLED: [] };

export async function setOrderStatus(ctx, id, { status, reason }) {
  const o = await getOrder(ctx, id);
  if (!NEXT[o.status].includes(status)) throw conflict('INVALID_TRANSITION', o.status === 'READY' && status !== 'CANCELLED' ? 'Bill the order at the counter to complete it' : `Cannot move an order from ${o.status} to ${status}`);
  const { count } = await prisma.shopOrder.updateMany({ where: { id, status: o.status }, data: { status, ...(status === 'CANCELLED' ? { cancelledBy: 'SALON', cancelReason: reason ?? null } : {}) } });
  if (!count) throw conflict('STALE', 'The order changed on another screen. Refresh and try again.');
  await audit(prisma, ctx, 'order.status', { entityType: 'ShopOrder', entityId: id, detail: { from: o.status, to: status, reason } });
  return orderView(await getOrder(ctx, id));
}

/** Order → billing counter: the cart the POS opens (prices are re-read at checkout). */
export async function cartForOrder(ctx, id) {
  const o = await getOrder(ctx, id);
  if (!OPEN_ORDER.includes(o.status)) throw conflict('ORDER_CLOSED', `Order ${o.number} is ${o.status.toLowerCase()}`);
  const items = await prisma.catalogItem.findMany({ where: { tenantId: ctx.tenantId, id: { in: o.lines.map((l) => l.itemId) } }, select: { id: true, name: true, price: true } });
  return {
    shopOrderId: o.id, orderNumber: o.number, branchId: o.branchId, customerId: o.customerId,
    lines: o.lines.map((l) => { const it = items.find((i) => i.id === l.itemId); return { type: 'PRODUCT', itemId: l.itemId, quantity: l.quantity, description: it?.name ?? l.name, unitPrice: money(it?.price ?? l.unitPrice) }; }),
  };
}
