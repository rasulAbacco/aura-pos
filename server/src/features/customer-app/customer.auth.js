/**
 * Customer app sign-in: mobile number + one-time SMS code (no email, no password).
 *
 *   POST /customer/auth/otp      { phone }            → sends a 6-digit code (valid 10 minutes)
 *   POST /customer/auth/verify   { phone, code }      → signs in (creates the account on first sign-in)
 *   POST /customer/auth/refresh                       → new access token (rotating refresh token)
 *   POST /customer/auth/logout
 *
 * Sessions reuse the shared session table with principal type "customer", so a customer token can
 * never call salon or platform APIs (each checks its own token audience), and the reverse.
 * Like the salon app: the phone app (X-Client-Platform: native) gets the refresh token in the body,
 * browsers get an HttpOnly cookie limited to /api/v1/customer/auth.
 */
import crypto from 'node:crypto';
import { prisma } from '../../core/database/prisma.js';
import { env, isProd, isTest } from '../../config/env.js';
import { AppError, badRequest, unauthorized } from '../../core/errors/errors.js';
import { parse, ok } from '../../core/utils/http.js';
import { ipHash } from '../../core/utils/tokens.js';
import { sendOtpSms } from '../../core/sms/sms.js';
import { createSession, rotateRefreshToken, revokeSessionByToken, sameSiteFor, verifyAccessToken } from '../auth/auth.sessions.js';
import { normalizeMobile } from './customer.phone.js';
import { otpRequestSchema, otpVerifySchema } from './customer.validation.js';

export const CUSTOMER_COOKIE = 'sg_cust_rt';
const COOKIE_PATH = '/api/v1/customer/auth';
const CODE_TTL_MS = 10 * 60000;
const RESEND_AFTER_SEC = 30;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

const codeHash = (phone, code) => crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(`otp:${phone}:${code}`).digest('hex');
const isNative = (req) => req.get('x-client-platform') === 'native';
const ttlDays = (req) => (isNative(req) ? env.REFRESH_TOKEN_TTL_DAYS_NATIVE : env.REFRESH_TOKEN_TTL_DAYS);

export const accountView = (a) => ({ id: a.id, phone: a.phone, name: a.name, email: a.email, gender: a.gender, birthday: a.birthday ? a.birthday.toISOString().slice(0, 10) : null });

function issue(req, res, refreshToken, accessToken, account) {
  if (!isNative(req)) {
    res.cookie(CUSTOMER_COOKIE, refreshToken, { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: sameSiteFor(req), path: COOKIE_PATH, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400000 });
  }
  return { accessToken, ...(isNative(req) ? { refreshToken } : {}), account: accountView(account), needsName: !account.name };
}
function requireCsrfHeader(req) {
  if (req.get('x-requested-with') !== 'XMLHttpRequest') throw new AppError(403, 'CSRF_HEADER_MISSING', 'Missing X-Requested-With header');
}
function incoming(req) {
  const c = req.cookies?.[CUSTOMER_COOKIE];
  if (c) return c;
  const b = isNative(req) ? req.body?.refreshToken : undefined;
  return typeof b === 'string' && b.length <= 200 ? b : undefined;
}

export async function requestOtp(req, res) {
  const phone = normalizeMobile(parse(otpRequestSchema, req.body).phone);
  const now = Date.now();
  const recent = await prisma.customerOtp.findMany({ where: { phone, createdAt: { gt: new Date(now - 3600000) } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  if (recent[0] && now - recent[0].createdAt.getTime() < RESEND_AFTER_SEC * 1000) {
    const wait = Math.ceil(RESEND_AFTER_SEC - (now - recent[0].createdAt.getTime()) / 1000);
    throw new AppError(429, 'OTP_TOO_SOON', `Please wait ${wait} seconds before asking for a new code.`, { retryAfterSec: wait });
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) throw new AppError(429, 'OTP_LIMIT', 'Too many codes requested for this number. Please try again in an hour.');

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  // Only the newest code works: earlier unused codes for this number are cancelled.
  await prisma.customerOtp.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } });
  const row = await prisma.customerOtp.create({ data: { phone, codeHash: codeHash(phone, code), expiresAt: new Date(now + CODE_TTL_MS), ipHash: ipHash(req.ip) } });
  try {
    await sendOtpSms(phone, code);
  } catch (e) {
    await prisma.customerOtp.delete({ where: { id: row.id } }).catch(() => {});
    throw e;
  }
  const echo = isTest || (!isProd && env.OTP_DEV_ECHO && env.SMS_PROVIDER === 'console');
  ok(res, { sent: true, phone, resendAfterSec: RESEND_AFTER_SEC, expiresInSec: CODE_TTL_MS / 1000, ...(echo ? { devCode: code } : {}) });
}

export async function verifyOtp(req, res) {
  const body = parse(otpVerifySchema, req.body);
  const phone = normalizeMobile(body.phone);
  const otp = await prisma.customerOtp.findFirst({ where: { phone, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!otp) throw badRequest('This code has expired. Ask for a new one.');
  if (otp.attempts >= MAX_ATTEMPTS) {
    await prisma.customerOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    throw badRequest('Too many wrong tries. Ask for a new code.');
  }
  const good = crypto.timingSafeEqual(Buffer.from(codeHash(phone, body.code)), Buffer.from(otp.codeHash));
  if (!good) {
    await prisma.customerOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - otp.attempts - 1;
    throw badRequest(left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Wrong code. Ask for a new one.');
  }
  // Single use, even if two requests race.
  const { count } = await prisma.customerOtp.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (count !== 1) throw badRequest('This code was already used. Ask for a new one.');

  const account = await prisma.customerAccount.upsert({ where: { phone }, update: { lastLoginAt: new Date() }, create: { phone, lastLoginAt: new Date() } });
  if (!account.isActive) throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled. Please contact support.');
  const { refreshToken, accessToken } = await createSession({ principalType: 'customer', principalId: account.id, req, ttlDays: ttlDays(req) });
  ok(res, issue(req, res, refreshToken, accessToken, account));
}

export async function refresh(req, res) {
  requireCsrfHeader(req);
  const r = await rotateRefreshToken(incoming(req), 'customer', req, { ttlDays: ttlDays(req) });
  const account = await prisma.customerAccount.findUnique({ where: { id: r.principalId } });
  if (!account?.isActive) throw unauthorized('Account disabled');
  ok(res, issue(req, res, r.refreshToken, r.accessToken, account));
}

export async function logout(req, res) {
  requireCsrfHeader(req);
  await revokeSessionByToken(incoming(req), 'LOGOUT');
  res.clearCookie(CUSTOMER_COOKIE, { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: sameSiteFor(req), path: COOKIE_PATH });
  ok(res, { signedOut: true });
}

/** Middleware for every signed-in customer endpoint: sets req.cust. */
export async function authenticateCustomer(req, _res, next) {
  const h = req.get('authorization') ?? '';
  if (!h.startsWith('Bearer ')) throw unauthorized();
  const claims = verifyAccessToken(h.slice(7), 'customer');
  const [session, account] = await Promise.all([
    prisma.session.findUnique({ where: { id: claims.sid } }),
    prisma.customerAccount.findUnique({ where: { id: claims.sub } }),
  ]);
  if (!session || session.principalType !== 'customer' || session.principalId !== claims.sub
    || (session.revokedAt && session.revokeReason !== 'ROTATED') || session.expiresAt < new Date()) throw unauthorized('Session revoked');
  if (!account || !account.isActive) throw unauthorized('Account disabled');
  req.cust = { accountId: account.id, account, actor: `customer:${account.id}`, requestId: req.id };
  next();
}
