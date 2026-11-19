/**
 * Customer app (Salora Glam) business logic.
 *
 * Who sees what:
 * - A salon appears in the app only when it is listed (Settings → Customer app), not suspended, and its
 *   subscription allows business (trial, active or grace). Expired salons disappear until they renew.
 * - A customer account is one mobile number across all salons. At each salon it is linked to that salon's
 *   own Customer record with the same number (last 10 digits), created on the first booking/order.
 *   The number was proven by an SMS code, so showing that number's visits, bills and wallet is safe.
 * - Bookings from the app are ordinary appointments (source APP, status BOOKED = "waiting for the salon
 *   to confirm"). They hold the time slot immediately; the Postgres EXCLUDE constraint still prevents
 *   double-booking a stylist. Services booked together share a bookingGroup and run back to back.
 * - Product orders are click-and-collect: no money is taken in the app. The salon bills the order at the
 *   counter (POS), which re-prices it and takes stock as usual; the order is then COLLECTED.
 */
import crypto from 'node:crypto';
import { prisma, isExclusionViolation, isUniqueViolation } from '../../core/database/prisma.js';
import { AppError, badRequest, conflict, notFound } from '../../core/errors/errors.js';
import { audit } from '../../core/utils/audit.js';
import { evaluateEntitlement } from '../subscription/subscription.entitlements.js';
import { zonedToUtc, zonedDateString, weekdayKey, DEFAULT_HOURS } from '../../core/utils/time.js';
import { accountView } from './customer.auth.js';
import { imagesFor } from '../media/media.service.js';

const ACTIVE_APPT = ['BOOKED', 'CONFIRMED', 'WAITING', 'CHECKED_IN', 'IN_SERVICE'];
export const OPEN_ORDER = ['PLACED', 'CONFIRMED', 'READY'];
const STEP_MIN = 15;
const LEAD_MIN = 30;          // earliest bookable start: 30 minutes from now
const MAX_DAYS_AHEAD = 60;
const MAX_OPEN_BOOKINGS = 3;  // per salon, per customer (stops one person holding every slot)
const MAX_OPEN_ORDERS = 5;

const ctxFor = (cust, tenantId) => ({ tenantId, actor: cust.actor, requestId: cust.requestId });
const latestSub = { orderBy: { currentPeriodEnd: 'desc' }, take: 1, include: { plan: true } };

function isVisible(t) {
  if (!t?.appListed || t.status !== 'ACTIVE') return false;
  const sub = t.subscriptions?.[0];
  return evaluateEntitlement({ tenant: t, subscription: sub, plan: sub?.plan }).writable;
}

async function visibleTenant(where) {
  const t = await prisma.tenant.findFirst({ where, include: { subscriptions: latestSub } });
  if (!isVisible(t)) throw notFound('Salon');
  return t;
}

/** Branch of a visible salon, with the given app feature switched on. */
async function visibleBranch(branchId, feature) {
  const b = await prisma.branch.findFirst({ where: { id: branchId, isActive: true } });
  if (!b) throw notFound('Branch');
  const tenant = await visibleTenant({ id: b.tenantId });
  if (feature === 'booking' && !b.onlineBooking) throw new AppError(422, 'ONLINE_BOOKING_OFF', `${b.name} is not taking app bookings right now. Please call the salon.`);
  if (feature === 'orders' && !b.onlineOrders) throw new AppError(422, 'ONLINE_ORDERS_OFF', `${b.name} is not taking product orders right now.`);
  return { branch: b, tenant };
}

/** This account's Customer row at a salon (matched by mobile number), created if it doesn't exist yet. */
async function linkCustomer(tx, tenantId, account) {
  const rows = await tx.$queryRaw`
    SELECT id, "archivedAt" FROM "Customer"
    WHERE "tenantId" = ${tenantId}::uuid AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = ${account.phone}
    ORDER BY "archivedAt" NULLS FIRST, "createdAt" ASC LIMIT 1`;
  if (rows[0]) {
    if (rows[0].archivedAt) await tx.customer.update({ where: { id: rows[0].id }, data: { archivedAt: null } });
    return rows[0].id;
  }
  const c = await tx.customer.create({ data: { tenantId, name: account.name ?? 'App customer', phone: account.phone, email: account.email ?? null } });
  return c.id;
}

/** Customer rows at every salon with this account's mobile number. */
async function linkedCustomers(account) {
  return prisma.$queryRaw`
    SELECT id, "tenantId" FROM "Customer"
    WHERE right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = ${account.phone} AND "archivedAt" IS NULL`;
}

// ─────────────────────────────── Profile ───────────────────────────────

export async function updateProfile(cust, body) {
  const data = {};
  for (const k of ['name', 'email', 'gender']) if (body[k] !== undefined) data[k] = body[k];
  if (body.birthday !== undefined) data.birthday = body.birthday ? new Date(body.birthday) : null;
  const a = await prisma.customerAccount.update({ where: { id: cust.accountId }, data });
  return accountView(a);
}

// ─────────────────────────────── Discover ───────────────────────────────

const money = (d) => (d == null ? null : Number(d).toFixed(2));

export async function listSalons({ q, category, city }) {
  const where = {
    appListed: true, status: 'ACTIVE',
    ...(category ? { category } : {}),
    branches: { some: { isActive: true, ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}) } },
    ...(q ? { OR: [
      { displayName: { contains: q, mode: 'insensitive' } },
      { tagline: { contains: q, mode: 'insensitive' } },
      { branches: { some: { isActive: true, OR: [{ name: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }, { address: { contains: q, mode: 'insensitive' } }] } } },
      { catalogItems: { some: { isActive: true, archivedAt: null, name: { contains: q, mode: 'insensitive' } } } },
    ] } : {}),
  };
  const tenants = await prisma.tenant.findMany({
    where, take: 100, orderBy: { displayName: 'asc' },
    include: {
      subscriptions: latestSub,
      branches: { where: { isActive: true }, select: { id: true, name: true, city: true, address: true, onlineBooking: true, onlineOrders: true, latitude: true, longitude: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  const visible = tenants.filter(isVisible);
  if (!visible.length) return [];
  const ids = visible.map((t) => t.id);
  const [stats, photos] = await Promise.all([
    prisma.catalogItem.groupBy({ by: ['tenantId', 'type'], where: { tenantId: { in: ids }, isActive: true, archivedAt: null, showInApp: true }, _count: { _all: true }, _min: { price: true } }),
    imagesFor('SALON', ids),
  ]);
  return visible.map((t) => {
    const s = (type) => stats.find((x) => x.tenantId === t.id && x.type === type);
    return {
      slug: t.slug, name: t.displayName, tagline: t.tagline, category: t.category,
      cities: [...new Set(t.branches.map((b) => b.city).filter(Boolean))],
      branchCount: t.branches.length,
      area: t.branches[0]?.address ?? null,
      serviceCount: s('SERVICE')?._count._all ?? 0,
      productCount: s('PRODUCT')?._count._all ?? 0,
      startingFrom: money(s('SERVICE')?._min.price),
      onlineBooking: t.branches.some((b) => b.onlineBooking),
      onlineOrders: t.branches.some((b) => b.onlineOrders),
      coverImageId: photos.get(t.id)?.[0]?.id ?? null,
      // Map positions of the branches, so the app can show "2.4 km away" from the customer's location.
      points: t.branches.filter((b) => b.latitude != null && b.longitude != null).map((b) => ({ branchId: b.id, name: b.name, lat: b.latitude, lng: b.longitude })),
    };
  });
}

export async function salonDetail(slug) {
  const t = await visibleTenant({ slug });
  const [branches, items, staff] = await Promise.all([
    prisma.branch.findMany({ where: { tenantId: t.id, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, address: true, city: true, phone: true, businessHours: true, onlineBooking: true, onlineOrders: true, latitude: true, longitude: true } }),
    prisma.catalogItem.findMany({ where: { tenantId: t.id, isActive: true, archivedAt: null, showInApp: true }, orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }], include: { category: { select: { name: true } }, stockLevels: { select: { branchId: true, quantity: true } } } }),
    prisma.staffProfile.findMany({ where: { tenantId: t.id, status: 'ACTIVE', isBookable: true, archivedAt: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, designation: true, branchId: true } }),
  ]);
  const [reserved, productPhotos, salonPhotos] = await Promise.all([
    reservedByBranch(t.id),
    imagesFor('PRODUCT', items.filter((i) => i.type === 'PRODUCT').map((i) => i.id)),
    imagesFor('SALON', [t.id]),
  ]);
  const orderBranches = new Set(branches.filter((b) => b.onlineOrders).map((b) => b.id));
  return {
    slug: t.slug, name: t.displayName, tagline: t.tagline, about: t.about, category: t.category,
    pricesIncludeTax: t.pricesIncludeTax, timezone: t.timezone,
    photos: salonPhotos.get(t.id) ?? [],
    branches: branches.map((b) => ({ ...b, businessHours: b.businessHours ?? DEFAULT_HOURS })),
    services: items.filter((i) => i.type === 'SERVICE').map((i) => ({ id: i.id, name: i.name, description: i.description, category: i.category.name, price: money(i.price), durationMin: i.durationMin ?? 45 })),
    products: items.filter((i) => i.type === 'PRODUCT').map((i) => ({
      id: i.id, name: i.name, description: i.description, category: i.category.name, price: money(i.price),
      brand: i.brand, size: i.size, mrp: i.mrp != null && Number(i.mrp) > Number(i.price) ? money(i.mrp) : null,
      highlights: i.highlights, howToUse: i.howToUse, ingredients: i.ingredients,
      images: productPhotos.get(i.id) ?? [],
      // Units customers can still order at each branch: stock minus what open app orders already hold.
      stock: Object.fromEntries(i.stockLevels.filter((s) => orderBranches.has(s.branchId)).map((s) => [s.branchId, Math.max(0, s.quantity - (reserved.get(`${s.branchId}:${i.id}`) ?? 0))])),
    })),
    staff: staff.map((s) => ({ id: s.id, name: s.name, designation: s.designation, branchId: s.branchId })),
  };
}

/**
 * Shop: products in stock for pickup at listed salons (all salons, or one search).
 * Each product carries the branches that have it, with map positions, so the app can sort by distance.
 */
export async function listProducts({ q }) {
  const tenants = await prisma.tenant.findMany({ where: { appListed: true, status: 'ACTIVE', branches: { some: { isActive: true, onlineOrders: true } } }, include: { subscriptions: latestSub } });
  const visible = tenants.filter(isVisible);
  if (!visible.length) return [];
  const items = await prisma.catalogItem.findMany({
    where: {
      tenantId: { in: visible.map((t) => t.id) }, type: 'PRODUCT', isActive: true, archivedAt: null, showInApp: true,
      stockLevels: { some: { quantity: { gt: 0 }, branch: { isActive: true, onlineOrders: true } } },
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { brand: { contains: q, mode: 'insensitive' } }, { category: { name: { contains: q, mode: 'insensitive' } } }, { tenant: { displayName: { contains: q, mode: 'insensitive' } } }] } : {}),
    },
    take: 120, orderBy: { name: 'asc' },
    include: { category: { select: { name: true } }, stockLevels: { where: { quantity: { gt: 0 }, branch: { isActive: true, onlineOrders: true } }, select: { quantity: true, branch: { select: { id: true, name: true, city: true, latitude: true, longitude: true } } } } },
  });
  const photos = await imagesFor('PRODUCT', items.map((i) => i.id));
  const byId = new Map(visible.map((t) => [t.id, t]));
  return items.map((i) => ({
    id: i.id, name: i.name, brand: i.brand, size: i.size, category: i.category.name,
    price: money(i.price), mrp: i.mrp != null && Number(i.mrp) > Number(i.price) ? money(i.mrp) : null,
    imageId: photos.get(i.id)?.[0]?.id ?? null,
    salon: { slug: byId.get(i.tenantId).slug, name: byId.get(i.tenantId).displayName },
    branches: i.stockLevels.map((s) => ({ branchId: s.branch.id, name: s.branch.name, city: s.branch.city, lat: s.branch.latitude, lng: s.branch.longitude })),
  }));
}

/** Quantities held by open app orders, keyed "branchId:itemId". */
async function reservedByBranch(tenantId, db = prisma) {
  const rows = await db.shopOrderLine.groupBy({ by: ['itemId'], where: { order: { tenantId, status: { in: OPEN_ORDER } } }, _sum: { quantity: true } });
  if (!rows.length) return new Map();
  const lines = await db.shopOrderLine.findMany({ where: { order: { tenantId, status: { in: OPEN_ORDER } } }, select: { itemId: true, quantity: true, order: { select: { branchId: true } } } });
  const m = new Map();
  for (const l of lines) { const k = `${l.order.branchId}:${l.itemId}`; m.set(k, (m.get(k) ?? 0) + l.quantity); }
  return m;
}

// ─────────────────────────────── Availability ───────────────────────────────

async function servicesFor(tenantId, serviceIds) {
  const unique = [...new Set(serviceIds)];
  const rows = await prisma.catalogItem.findMany({ where: { id: { in: unique }, tenantId, type: 'SERVICE', isActive: true, archivedAt: null, showInApp: true } });
  if (rows.length !== unique.length) throw badRequest('One of the services is no longer available');
  return serviceIds.map((id) => rows.find((r) => r.id === id));
}

const bookableStaff = (tenantId, branchId, staffId) => prisma.staffProfile.findMany({
  where: { tenantId, status: 'ACTIVE', isBookable: true, archivedAt: null, OR: [{ branchId }, { branchId: null }], ...(staffId ? { id: staffId } : {}) },
  orderBy: { name: 'asc' },
});

async function busyByStaff(tenantId, staffIds, from, to) {
  const rows = await prisma.appointment.findMany({ where: { tenantId, staffId: { in: staffIds }, status: { in: ACTIVE_APPT.concat('COMPLETED') }, startsAt: { lt: to }, endsAt: { gt: from } }, select: { staffId: true, startsAt: true, endsAt: true } });
  const m = new Map(staffIds.map((id) => [id, []]));
  for (const r of rows) m.get(r.staffId)?.push([r.startsAt.getTime(), r.endsAt.getTime()]);
  return m;
}
const isFree = (busy, s, e) => !busy.some(([bs, be]) => s < be && e > bs);

function openWindows(branch, date, tz) {
  return ((branch.businessHours ?? DEFAULT_HOURS)[weekdayKey(date)] ?? []).map(([o, c]) => [zonedToUtc(date, o, tz).getTime(), zonedToUtc(date, c, tz).getTime()]);
}

function checkDateRange(date, tz) {
  const today = zonedDateString(new Date(), tz);
  const last = zonedDateString(new Date(Date.now() + MAX_DAYS_AHEAD * 86400000), tz);
  if (date < today || date > last) throw badRequest(`Pick a date between today and ${MAX_DAYS_AHEAD} days from now`);
}

export async function slots(slug, q) {
  const tenant = await visibleTenant({ slug });
  const { branch } = await visibleBranch(q.branchId, 'booking');
  if (branch.tenantId !== tenant.id) throw notFound('Branch');
  const tz = tenant.timezone;
  checkDateRange(q.date, tz);
  const services = await servicesFor(tenant.id, q.serviceIds);
  const dur = services.reduce((s, x) => s + (x.durationMin ?? 45), 0) * 60000;
  const staff = await bookableStaff(tenant.id, branch.id, q.staffId);
  const windows = openWindows(branch, q.date, tz);
  if (!staff.length || !windows.length) return { date: q.date, timezone: tz, durationMin: dur / 60000, slots: [], closed: !windows.length };
  const busy = await busyByStaff(tenant.id, staff.map((s) => s.id), new Date(windows[0][0]), new Date(windows.at(-1)[1]));
  const earliest = Date.now() + LEAD_MIN * 60000;
  const out = [];
  for (const [open, close] of windows) {
    for (let t = open; t + dur <= close; t += STEP_MIN * 60000) {
      if (t < earliest) continue;
      const free = staff.filter((s) => isFree(busy.get(s.id), t, t + dur));
      if (free.length) out.push({ at: new Date(t).toISOString(), staffCount: free.length });
    }
  }
  return { date: q.date, timezone: tz, durationMin: dur / 60000, slots: out, closed: false };
}

// ─────────────────────────────── Bookings ───────────────────────────────

const bookingInclude = { tenant: { select: { slug: true, displayName: true } }, branch: { select: { id: true, name: true, address: true, phone: true, latitude: true, longitude: true } }, staff: { select: { name: true } } };

/** Appointments → bookings (services booked together become one booking). */
function groupBookings(appts) {
  const groups = new Map();
  for (const a of appts) {
    const key = a.bookingGroup ?? a.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  return [...groups.entries()].map(([id, list]) => {
    list.sort((x, y) => x.startsAt - y.startsAt);
    const first = list[0];
    const live = list.filter((a) => a.status !== 'CANCELLED');
    const status = live.length ? live[0].status : 'CANCELLED';
    return {
      id, source: first.source, status,
      salon: { slug: first.tenant.slug, name: first.tenant.displayName },
      branch: first.branch,
      startsAt: first.startsAt, endsAt: list.at(-1).endsAt,
      staffName: first.staff?.name ?? null,
      services: list.map((a) => ({ name: a.serviceName, startsAt: a.startsAt, endsAt: a.endsAt, status: a.status })),
      notes: first.notes, cancelReason: list.find((a) => a.cancelReason)?.cancelReason ?? null,
      canCancel: ['BOOKED', 'CONFIRMED'].includes(status) && first.startsAt.getTime() > Date.now(),
      createdAt: first.createdAt,
    };
  });
}

export async function createBooking(cust, body) {
  const account = await prisma.customerAccount.findUnique({ where: { id: cust.accountId } });
  if (!account.name) throw new AppError(422, 'NAME_REQUIRED', 'Add your name in your profile before booking.');
  const { branch, tenant } = await visibleBranch(body.branchId, 'booking');

  // Same request sent twice (double tap, lost response): return the first booking.
  const again = await prisma.appointment.findMany({ where: { tenantId: tenant.id, bookingGroup: body.requestId }, include: bookingInclude });
  if (again.length) return groupBookings(again)[0];

  const tz = tenant.timezone;
  const services = await servicesFor(tenant.id, body.serviceIds);
  const dur = services.reduce((s, x) => s + (x.durationMin ?? 45), 0) * 60000;
  const start = body.startsAt.getTime();
  const date = zonedDateString(body.startsAt, tz);
  checkDateRange(date, tz);
  if (start < Date.now() + (LEAD_MIN - 5) * 60000) throw badRequest(`Bookings must be at least ${LEAD_MIN} minutes from now`);
  if (!openWindows(branch, date, tz).some(([o, c]) => start >= o && start + dur <= c)) throw badRequest('The salon is closed at that time. Please pick another slot.');

  const staff = await bookableStaff(tenant.id, branch.id, body.staffId ?? undefined);
  if (!staff.length) throw badRequest(body.staffId ? 'That stylist is not available for booking' : 'No stylist is available for booking at this branch');
  const busy = await busyByStaff(tenant.id, staff.map((s) => s.id), new Date(start - 86400000), new Date(start + 86400000));
  // "Any stylist": the free stylist with the lightest day.
  const free = staff.filter((s) => isFree(busy.get(s.id), start, start + dur)).sort((a, b) => busy.get(a.id).length - busy.get(b.id).length);
  if (!free.length) throw conflict('SLOT_TAKEN', 'That time was just taken. Please pick another slot.');

  for (const s of free) {
    try {
      const appts = await prisma.$transaction(async (tx) => {
        const customerId = await linkCustomer(tx, tenant.id, account);
        const open = await tx.appointment.findMany({ where: { tenantId: tenant.id, customerId, source: 'APP', status: { in: ['BOOKED', 'CONFIRMED'] }, startsAt: { gt: new Date() } }, select: { bookingGroup: true, id: true } });
        if (new Set(open.map((a) => a.bookingGroup ?? a.id)).size >= MAX_OPEN_BOOKINGS) {
          throw new AppError(422, 'TOO_MANY_BOOKINGS', `You already have ${MAX_OPEN_BOOKINGS} upcoming bookings at ${tenant.displayName}. Cancel one or wait until after your visit.`);
        }
        let t = start;
        const created = [];
        for (const svc of services) {
          const end = t + (svc.durationMin ?? 45) * 60000;
          created.push(await tx.appointment.create({ data: {
            tenantId: tenant.id, branchId: branch.id, customerId, staffId: s.id, serviceId: svc.id, serviceName: svc.name,
            startsAt: new Date(t), endsAt: new Date(end), status: 'BOOKED', source: 'APP', bookingGroup: body.requestId, notes: body.notes ?? null,
          }, include: bookingInclude }));
          t = end;
        }
        await audit(tx, ctxFor(cust, tenant.id), 'appointment.app_request', { entityType: 'Appointment', entityId: created[0].id, detail: { group: body.requestId, services: services.length } });
        return created;
      });
      return groupBookings(appts)[0];
    } catch (e) {
      if (!isExclusionViolation(e)) throw e; // someone took this stylist at the same moment: try the next free one
    }
  }
  throw conflict('SLOT_TAKEN', 'That time was just taken. Please pick another slot.');
}

export async function listBookings(cust) {
  const linked = await linkedCustomers(cust.account);
  if (!linked.length) return [];
  const appts = await prisma.appointment.findMany({
    where: { customerId: { in: linked.map((c) => c.id) }, startsAt: { gt: new Date(Date.now() - 365 * 86400000) } },
    orderBy: { startsAt: 'desc' }, take: 300, include: bookingInclude,
  });
  return groupBookings(appts).sort((a, b) => b.startsAt - a.startsAt);
}

export async function cancelBooking(cust, id, reason) {
  const linked = await linkedCustomers(cust.account);
  const appts = await prisma.appointment.findMany({ where: { customerId: { in: linked.map((c) => c.id) }, OR: [{ bookingGroup: id }, { id }] } });
  if (!appts.length) throw notFound('Booking');
  const cancellable = appts.filter((a) => ['BOOKED', 'CONFIRMED'].includes(a.status));
  if (!cancellable.length) throw conflict('NOT_CANCELLABLE', 'This booking can no longer be cancelled. Please call the salon.');
  if (Math.min(...cancellable.map((a) => a.startsAt.getTime())) < Date.now()) throw conflict('NOT_CANCELLABLE', 'This booking has already started. Please call the salon.');
  await prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({ where: { id: { in: cancellable.map((a) => a.id) }, status: { in: ['BOOKED', 'CONFIRMED'] } }, data: { status: 'CANCELLED', cancelReason: `Cancelled by customer${reason ? `: ${reason}` : ''}` } });
    await audit(tx, ctxFor(cust, appts[0].tenantId), 'appointment.app_cancel', { entityType: 'Appointment', entityId: appts[0].id, detail: { reason } });
  });
  const key = appts[0].bookingGroup ?? appts[0].id;
  return (await listBookings(cust)).find((b) => b.id === key);
}

// ─────────────────────────────── Product orders ───────────────────────────────

const orderInclude = { lines: true, tenant: { select: { slug: true, displayName: true } }, branch: { select: { id: true, name: true, address: true, phone: true, latitude: true, longitude: true } } };
export const orderView = (o) => ({
  id: o.id, number: o.number, status: o.status, itemsTotal: money(o.itemsTotal), notes: o.notes,
  cancelReason: o.cancelReason, cancelledBy: o.cancelledBy, invoiceId: o.invoiceId,
  salon: o.tenant ? { slug: o.tenant.slug, name: o.tenant.displayName } : undefined,
  branch: o.branch, createdAt: o.createdAt, updatedAt: o.updatedAt,
  lines: o.lines.map((l) => ({ itemId: l.itemId, name: l.name, unitPrice: money(l.unitPrice), quantity: l.quantity })),
  canCancel: ['PLACED', 'CONFIRMED'].includes(o.status),
});

export async function createOrder(cust, body) {
  const account = await prisma.customerAccount.findUnique({ where: { id: cust.accountId } });
  if (!account.name) throw new AppError(422, 'NAME_REQUIRED', 'Add your name in your profile before ordering.');
  const again = await prisma.shopOrder.findUnique({ where: { accountId_idempotencyKey: { accountId: account.id, idempotencyKey: body.requestId } }, include: orderInclude });
  if (again) return orderView(again);

  const { branch, tenant } = await visibleBranch(body.branchId, 'orders');
  const qty = new Map();
  for (const i of body.items) qty.set(i.itemId, (qty.get(i.itemId) ?? 0) + i.quantity);
  const ids = [...qty.keys()].sort();
  const items = await prisma.catalogItem.findMany({ where: { id: { in: ids }, tenantId: tenant.id, type: 'PRODUCT', isActive: true, archivedAt: null, showInApp: true } });
  if (items.length !== ids.length) throw badRequest('One of the products is no longer available');

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Lock this branch's stock rows for these products so two orders can't both take the last unit.
      const stock = await tx.$queryRaw`SELECT "itemId", quantity FROM "StockLevel" WHERE "branchId" = ${branch.id}::uuid AND "itemId" = ANY(${ids}::uuid[]) ORDER BY "itemId" FOR UPDATE`;
      const reserved = await reservedByBranch(tenant.id, tx);
      for (const it of items) {
        const onHand = Number(stock.find((s) => s.itemId === it.id)?.quantity ?? 0);
        const left = onHand - (reserved.get(`${branch.id}:${it.id}`) ?? 0);
        if (qty.get(it.id) > left) throw new AppError(422, 'OUT_OF_STOCK', left > 0 ? `Only ${left} × ${it.name} left at ${branch.name}` : `${it.name} is out of stock at ${branch.name}`, { itemId: it.id, available: Math.max(0, left) });
      }
      const customerId = await linkCustomer(tx, tenant.id, account);
      const open = await tx.shopOrder.count({ where: { tenantId: tenant.id, accountId: account.id, status: { in: OPEN_ORDER } } });
      if (open >= MAX_OPEN_ORDERS) throw new AppError(422, 'TOO_MANY_ORDERS', `You already have ${MAX_OPEN_ORDERS} open orders at ${tenant.displayName}. Collect or cancel one first.`);
      const [{ seq }] = await tx.$queryRaw`UPDATE "Branch" SET "nextOrderNumber" = "nextOrderNumber" + 1 WHERE id = ${branch.id}::uuid RETURNING "nextOrderNumber" - 1 AS seq`;
      const total = items.reduce((s, it) => s + Number(it.price) * qty.get(it.id), 0);
      const o = await tx.shopOrder.create({
        data: {
          tenantId: tenant.id, branchId: branch.id, customerId, accountId: account.id, number: `${branch.code}-O${seq}`,
          itemsTotal: total.toFixed(2), notes: body.notes ?? null, idempotencyKey: body.requestId,
          lines: { create: items.map((it) => ({ itemId: it.id, name: it.name, unitPrice: it.price, quantity: qty.get(it.id) })) },
        },
        include: orderInclude,
      });
      await audit(tx, ctxFor(cust, tenant.id), 'order.app_place', { entityType: 'ShopOrder', entityId: o.id, detail: { number: o.number } });
      return o;
    });
    return orderView(order);
  } catch (e) {
    if (isUniqueViolation(e)) { // the same request raced itself
      const o = await prisma.shopOrder.findUnique({ where: { accountId_idempotencyKey: { accountId: account.id, idempotencyKey: body.requestId } }, include: orderInclude });
      if (o) return orderView(o);
    }
    throw e;
  }
}

export async function listOrders(cust) {
  const rows = await prisma.shopOrder.findMany({ where: { accountId: cust.accountId }, orderBy: { createdAt: 'desc' }, take: 100, include: orderInclude });
  return rows.map(orderView);
}

export async function cancelOrder(cust, id, reason) {
  const o = await prisma.shopOrder.findFirst({ where: { id, accountId: cust.accountId } });
  if (!o) throw notFound('Order');
  const { count } = await prisma.shopOrder.updateMany({ where: { id, status: { in: ['PLACED', 'CONFIRMED'] } }, data: { status: 'CANCELLED', cancelledBy: 'CUSTOMER', cancelReason: reason ?? null } });
  if (!count) throw conflict('NOT_CANCELLABLE', o.status === 'READY' ? 'Your order is already packed. Please call the salon to cancel.' : `This order is already ${o.status.toLowerCase()}.`);
  await audit(prisma, ctxFor(cust, o.tenantId), 'order.app_cancel', { entityType: 'ShopOrder', entityId: o.id, detail: { reason } });
  return orderView(await prisma.shopOrder.findUnique({ where: { id }, include: orderInclude }));
}

// ─────────────────────────────── My salons ───────────────────────────────

/** For each salon that knows this mobile number: visits, spend, wallet, membership and recent bills. */
export async function mySalons(cust) {
  const linked = await linkedCustomers(cust.account);
  if (!linked.length) return [];
  const now = new Date();
  const customers = await prisma.customer.findMany({
    where: { id: { in: linked.map((c) => c.id) }, tenant: { status: { not: 'CLOSED' } } },
    include: {
      tenant: { select: { slug: true, displayName: true, appListed: true } },
      memberships: { where: { endsAt: { gt: now }, status: 'ACTIVE' }, include: { plan: { select: { name: true, discountPercent: true } } }, orderBy: { endsAt: 'desc' }, take: 1 },
      invoices: { where: { kind: 'INVOICE', status: { not: 'VOID' } }, orderBy: { issuedAt: 'desc' }, take: 5, select: { id: true, number: true, issuedAt: true, grandTotal: true, amountDue: true, status: true } },
    },
  });
  return customers.map((c) => ({
    salon: { slug: c.tenant.slug, name: c.tenant.displayName, inApp: c.tenant.appListed },
    visits: c.visitCount, lifetimeSpend: money(c.lifetimeSpend), walletBalance: money(c.walletBalance), lastVisitAt: c.lastVisitAt,
    membership: c.memberships[0] ? { name: c.memberships[0].plan.name, discountPercent: Number(c.memberships[0].plan.discountPercent), endsAt: c.memberships[0].endsAt } : null,
    recentBills: c.invoices.map((i) => ({ number: i.number, issuedAt: i.issuedAt, total: money(i.grandTotal), due: money(i.amountDue), status: i.status })),
  })).sort((a, b) => (b.lastVisitAt?.getTime() ?? 0) - (a.lastVisitAt?.getTime() ?? 0));
}

export const newRequestId = () => crypto.randomUUID();
