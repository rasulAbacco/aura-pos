import { parse, ok, created, toJSONSafe } from '../../core/utils/http.js';
import { AppError } from '../../core/errors/errors.js';
import { env } from '../../config/env.js';
import { entitlementSummary } from './subscription.summary.js';
import * as billing from './subscription.service.js';
import { orderSchema, verifySchema } from './subscription.validation.js';

export async function status(req, res) {
  const sub = req.ctx.subscription;
  ok(res, toJSONSafe({
    entitlement: entitlementSummary(req.ctx.entitlement, sub),
    subscription: sub ? { id: sub.id, status: sub.status, plan: { id: sub.plan.id, code: sub.plan.code, name: sub.plan.name, interval: sub.plan.interval, price: sub.plan.price }, currentPeriodStart: sub.currentPeriodStart, currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd } : null,
    paymentsConfigured: !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  }));
}

export async function payments(req, res) { ok(res, toJSONSafe(await billing.listPayments(req.ctx))); }
export async function events(req, res) { ok(res, toJSONSafe(await billing.listEvents(req.ctx))); }

export async function createOrder(req, res) {
  if (req.ctx.tenant.status === 'SUSPENDED') throw new AppError(423, 'ACCOUNT_SUSPENDED', 'Your account is suspended. Contact support to resolve it before purchasing.');
  created(res, await billing.createPlanOrder(req.ctx, parse(orderSchema, req.body).planId));
}

export async function verify(req, res) { ok(res, await billing.verifyCheckout(req.ctx, parse(verifySchema, req.body))); }
export async function cancel(req, res) { ok(res, await billing.cancelAtPeriodEnd(req.ctx)); }
