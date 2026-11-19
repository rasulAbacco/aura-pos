/**
 * Customer app API — /api/v1/customer
 * Public: sign-in (OTP), salon discovery and free time slots.
 * Signed in (customer token): profile, bookings, product orders, my salons.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { isTest } from '../../config/env.js';
import { AppError, notFound } from '../../core/errors/errors.js';
import { parse, ok, created, toJSONSafe } from '../../core/utils/http.js';
import * as auth from './customer.auth.js';
import * as svc from './customer.service.js';
import { profileSchema, salonsQuery, slotsQuery, bookingSchema, orderSchema, cancelSchema } from './customer.validation.js';
import { accountView } from './customer.auth.js';

export const router = Router();

const limiter = (max, windowMin = 15) => rateLimit({
  windowMs: windowMin * 60000, limit: isTest ? 1000 : max, standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait and try again.')),
});
const send = (res, data) => ok(res, toJSONSafe(data));

// ── Sign-in
router.post('/auth/otp', limiter(20), auth.requestOtp);
router.post('/auth/verify', limiter(40), auth.verifyOtp);
router.post('/auth/refresh', limiter(300), auth.refresh);
router.post('/auth/logout', auth.logout);

// ── Discover (no sign-in needed)
router.get('/salons', async (req, res) => send(res, await svc.listSalons(parse(salonsQuery, req.query))));
router.get('/salons/:slug', async (req, res) => send(res, await svc.salonDetail(req.params.slug)));
router.get('/products', async (req, res) => send(res, await svc.listProducts({ q: typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '' })));
router.get('/salons/:slug/slots', async (req, res) => send(res, await svc.slots(req.params.slug, parse(slotsQuery, req.query))));

// ── Signed in
const me = Router();
me.use(auth.authenticateCustomer);
me.param('id', (_req, _res, next, id) => (/^[0-9a-f-]{36}$/i.test(id) ? next() : next(notFound('Booking or order'))));
me.get('/me', (req, res) => send(res, accountView(req.cust.account)));
me.patch('/me', async (req, res) => send(res, await svc.updateProfile(req.cust, parse(profileSchema, req.body))));
me.get('/bookings', async (req, res) => send(res, await svc.listBookings(req.cust)));
me.post('/bookings', limiter(30), async (req, res) => created(res, toJSONSafe(await svc.createBooking(req.cust, parse(bookingSchema, req.body)))));
me.post('/bookings/:id/cancel', async (req, res) => send(res, await svc.cancelBooking(req.cust, req.params.id, parse(cancelSchema, req.body ?? {}).reason)));
me.get('/orders', async (req, res) => send(res, await svc.listOrders(req.cust)));
me.post('/orders', limiter(30), async (req, res) => created(res, toJSONSafe(await svc.createOrder(req.cust, parse(orderSchema, req.body)))));
me.post('/orders/:id/cancel', async (req, res) => send(res, await svc.cancelOrder(req.cust, req.params.id, parse(cancelSchema, req.body ?? {}).reason)));
me.get('/my-salons', async (req, res) => send(res, await svc.mySalons(req.cust)));
router.use(me);
