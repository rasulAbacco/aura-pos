/** Customer-app requests for the salon — /api/v1/online (branch = X-Branch-Id, like the appointments page). */
import { Router } from 'express';
import { z } from 'zod';
import { requirePermission, requireWritable } from '../../core/middleware/auth.middleware.js';
import { resolveBranch } from '../../core/utils/branch.js';
import { notFound, forbidden } from '../../core/errors/errors.js';
import { parse, ok, toJSONSafe } from '../../core/utils/http.js';
import * as svc from './online.service.js';

export const router = Router();
const send = (res, data) => ok(res, toJSONSafe(data));
router.param('id', (_req, _res, next, id) => (/^[0-9a-f-]{36}$/i.test(id) ? next() : next(notFound('Booking or order'))));

const viewQ = (allowed, def) => z.object({ view: z.enum(allowed).default(def) });
const reasonQ = z.object({ reason: z.string().trim().max(200).optional() });
const statusQ = z.object({ status: z.enum(['CONFIRMED', 'READY', 'CANCELLED']), reason: z.string().trim().max(200).optional() });

// Who sees App requests: anyone who can answer them (online.respond — every role by default), see
// appointments or bill. The owner can take online.respond away from a person in Team permissions.
const anyOf = (...perms) => (req, _res, next) => {
  if (perms.some((p) => req.ctx.permissions.has(p))) return next();
  return next(forbidden(`Missing permission: ${perms[0]}`));
};
const canSee = anyOf('online.respond', 'appointments.view', 'pos.bill');
const respond = [requirePermission('online.respond'), requireWritable()];

router.get('/summary', canSee, async (req, res) => send(res, await svc.summary(req.ctx, await resolveBranch(req))));
// Small and cheap: polled every ~20 s by the salon app to ring the alert for new requests.
router.get('/pulse', canSee, async (req, res) => send(res, await svc.pulse(req.ctx, await resolveBranch(req))));

router.get('/bookings', anyOf('online.respond', 'appointments.view'), async (req, res) => send(res, await svc.listBookings(req.ctx, await resolveBranch(req), parse(viewQ(['pending', 'upcoming', 'all'], 'pending'), req.query).view)));
router.post('/bookings/:id/confirm', ...respond, async (req, res) => send(res, await svc.confirmBooking(req.ctx, req.params.id)));
router.post('/bookings/:id/decline', ...respond, async (req, res) => send(res, await svc.declineBooking(req.ctx, req.params.id, parse(reasonQ, req.body ?? {}).reason)));

router.get('/orders', anyOf('online.respond', 'pos.bill'), async (req, res) => send(res, await svc.listOrders(req.ctx, await resolveBranch(req), parse(viewQ(['open', 'all'], 'open'), req.query).view)));
router.post('/orders/:id/status', ...respond, async (req, res) => send(res, await svc.setOrderStatus(req.ctx, req.params.id, parse(statusQ, req.body))));
router.get('/orders/:id/cart', requirePermission('pos.bill'), async (req, res) => send(res, await svc.cartForOrder(req.ctx, req.params.id)));
