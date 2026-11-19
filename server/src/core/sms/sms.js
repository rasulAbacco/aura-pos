/**
 * SMS delivery boundary (customer-app sign-in codes).
 *   console → development only: the message is written to the server log, nothing is sent.
 *   msg91   → MSG91 OTP API with a DLT-approved template (India). Template variable: ##OTP##.
 *   twilio  → Twilio Messages API.
 * In production `console` refuses to "send", so customers are never told a code went out when it didn't.
 */
import { env, isProd } from '../../config/env.js';
import { logger } from '../logger/logger.js';
import { AppError } from '../errors/errors.js';

const notConfigured = (what) => new AppError(503, 'SMS_NOT_CONFIGURED', `Sign-in by SMS is not set up yet (${what}). Please try again later.`);

/** Is real SMS delivery configured? (Shown to the platform admin; never exposes keys.) */
export function smsStatus() {
  if (env.SMS_PROVIDER === 'msg91') return { provider: 'msg91', ready: !!(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID) };
  if (env.SMS_PROVIDER === 'twilio') return { provider: 'twilio', ready: !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) };
  return { provider: 'console', ready: !isProd };
}

/** Send a sign-in code to a 10-digit Indian mobile number. Returns { delivered }. */
export async function sendOtpSms(phone10, code) {
  const to = `91${phone10}`;
  if (env.SMS_PROVIDER === 'msg91') {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) throw notConfigured('MSG91 keys missing');
    const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(env.MSG91_TEMPLATE_ID)}&mobile=${to}&otp=${code}&otp_expiry=10`;
    const r = await fetch(url, { method: 'POST', headers: { authkey: env.MSG91_AUTH_KEY, 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.type === 'error') { logger.warn({ status: r.status, msg: body.message }, 'msg91 send failed'); throw new AppError(502, 'SMS_FAILED', 'Could not send the code. Please try again.'); }
    return { delivered: true };
  }
  if (env.SMS_PROVIDER === 'twilio') {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) throw notConfigured('Twilio keys missing');
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: `+${to}`, From: env.TWILIO_FROM, Body: `${code} is your Salora Glam sign-in code. It expires in 10 minutes. Do not share it.` }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) { logger.warn({ status: r.status }, 'twilio send failed'); throw new AppError(502, 'SMS_FAILED', 'Could not send the code. Please try again.'); }
    return { delivered: true };
  }
  if (isProd) throw notConfigured('SMS_PROVIDER is console');
  logger.info({ phone: `******${phone10.slice(-4)}`, code }, 'customer sign-in code (development: not sent)');
  return { delivered: false };
}
