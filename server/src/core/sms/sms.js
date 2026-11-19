/**
 * SMS delivery boundary (customer-app sign-in codes).
 *   console   → development only: the message is written to the server log, nothing is sent.
 *   smsgatewayhub → SMS Gateway Hub SendSMS API with your DLT sender id, entity id and template id. The text
 *               (SMS_TEMPLATE_TEXT) must be the DLT-registered OTP template word for word; {otp} = the code.
 *   twofactor → 2Factor.in "send your own OTP" SMS API. We create and check the code ourselves (limits,
 *               expiry, single use stay in our server); 2Factor only delivers it. Optional template name.
 *   msg91     → MSG91 OTP API with a DLT-approved template (India). Template variable: ##OTP##.
 *   twilio  → Twilio Messages API.
 * In production `console` refuses to "send", so customers are never told a code went out when it didn't.
 */
import { env, isProd } from "../../config/env.js";
import { logger } from "../logger/logger.js";
import { AppError } from "../errors/errors.js";

const notConfigured = (what) =>
  new AppError(
    503,
    "SMS_NOT_CONFIGURED",
    `Sign-in by SMS is not set up yet (${what}). Please try again later.`,
  );

/** Is real SMS delivery configured? (Shown to the platform admin; never exposes keys.) */
export function smsStatus() {
  if (env.SMS_PROVIDER === "smsgatewayhub")
    return {
      provider: "smsgatewayhub",
      ready: !!(
        env.SMS_API_KEY &&
        env.SMS_SENDER_ID &&
        env.SMS_ROUTE &&
        env.SMS_ENTITY_ID &&
        env.SMS_TEMPLATE_ID
      ),
    };
  if (env.SMS_PROVIDER === "twofactor")
    return { provider: "twofactor", ready: !!env.TWOFACTOR_API_KEY };
  if (env.SMS_PROVIDER === "msg91")
    return {
      provider: "msg91",
      ready: !!(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID),
    };
  if (env.SMS_PROVIDER === "twilio")
    return {
      provider: "twilio",
      ready: !!(
        env.TWILIO_ACCOUNT_SID &&
        env.TWILIO_AUTH_TOKEN &&
        env.TWILIO_FROM
      ),
    };
  return { provider: "console", ready: !isProd };
}

/** Send a sign-in code to a 10-digit Indian mobile number. Returns { delivered }. */
/**
 * 2Factor.in: GET https://2factor.in/API/V1/{key}/SMS/{91XXXXXXXXXX}/{otp}[/{template}]
 * Answer: { "Status": "Success", "Details": "<session id>" } or { "Status": "Error", "Details": "<reason>" }.
 * The API key is part of the URL, so the URL is never logged.
 */
export async function twoFactorSend(
  { apiKey, template },
  phone10,
  code,
  fetchImpl = fetch,
) {
  const url = `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/91${phone10}/${code}${template ? `/${encodeURIComponent(template)}` : ""}`;
  let r;
  try {
    r = await fetchImpl(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    logger.warn({ provider: "2factor", err: e.name }, "2factor unreachable");
    throw new AppError(
      502,
      "SMS_FAILED",
      "Could not send the code. Please try again.",
    );
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.Status !== "Success") {
    // Details is 2Factor's reason (e.g. "Invalid API Key", "Insufficient balance", template not found).
    logger.warn(
      {
        provider: "2factor",
        status: r.status,
        details: String(body.Details ?? "").slice(0, 200),
      },
      "2factor send failed",
    );
    throw new AppError(
      502,
      "SMS_FAILED",
      "Could not send the code. Please try again.",
    );
  }
  return { delivered: true, sessionId: body.Details };
}

/**
 * SMS Gateway Hub: GET https://www.smsgatewayhub.com/api/mt/SendSMS?APIKey=…&senderid=…&channel=2&DCS=0
 *   &flashsms=0&number=91XXXXXXXXXX&text=…&route=…&EntityId=…&dlttemplateid=…
 * Sent only when the answer has ErrorCode "000". The API key is in the URL, so the URL is never logged.
 */
export async function smsGatewayHubSend(cfg, phone10, code, fetchImpl = fetch) {
  const params = new URLSearchParams({
    APIKey: cfg.apiKey,
    senderid: cfg.senderId,
    channel: "2",
    DCS: "0",
    flashsms: "0",
    number: `91${phone10}`,
    text: cfg.templateText.replaceAll("{otp}", code),
    route: cfg.route,
    EntityId: cfg.entityId,
    dlttemplateid: cfg.templateId,
  });
  let r;
  try {
    r = await fetchImpl(
      `https://www.smsgatewayhub.com/api/mt/SendSMS?${params}`,
      { method: "GET", signal: AbortSignal.timeout(15000) },
    );
  } catch (e) {
    logger.warn(
      { provider: "smsgatewayhub", err: e.name },
      "smsgatewayhub unreachable",
    );
    throw new AppError(
      502,
      "SMS_FAILED",
      "Could not send the code. Please try again.",
    );
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.ErrorCode !== "000") {
    // ErrorMessage is the gateway's reason (e.g. invalid key, template mismatch, low credits).
    logger.warn(
      {
        provider: "smsgatewayhub",
        status: r.status,
        errorCode: body.ErrorCode,
        details: String(body.ErrorMessage ?? "").slice(0, 200),
      },
      "smsgatewayhub send failed",
    );
    throw new AppError(
      502,
      "SMS_FAILED",
      "Could not send the code. Please try again.",
    );
  }
  return { delivered: true, jobId: body.JobId ?? null };
}

export async function sendOtpSms(phone10, code) {
  const to = `91${phone10}`;
  if (env.SMS_PROVIDER === "smsgatewayhub") {
    if (!smsStatus().ready)
      throw notConfigured("SMS Gateway Hub settings missing");
    return smsGatewayHubSend(
      {
        apiKey: env.SMS_API_KEY,
        senderId: env.SMS_SENDER_ID,
        route: env.SMS_ROUTE,
        entityId: env.SMS_ENTITY_ID,
        templateId: env.SMS_TEMPLATE_ID,
        templateText: env.SMS_TEMPLATE_TEXT,
      },
      phone10,
      code,
    );
  }
  if (env.SMS_PROVIDER === "twofactor") {
    if (!env.TWOFACTOR_API_KEY)
      throw notConfigured("TWOFACTOR_API_KEY missing");
    return twoFactorSend(
      { apiKey: env.TWOFACTOR_API_KEY, template: env.TWOFACTOR_TEMPLATE },
      phone10,
      code,
    );
  }
  if (env.SMS_PROVIDER === "msg91") {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID)
      throw notConfigured("MSG91 keys missing");
    const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(env.MSG91_TEMPLATE_ID)}&mobile=${to}&otp=${code}&otp_expiry=10`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        authkey: env.MSG91_AUTH_KEY,
        "content-type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(10000),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.type === "error") {
      logger.warn({ status: r.status, msg: body.message }, "msg91 send failed");
      throw new AppError(
        502,
        "SMS_FAILED",
        "Could not send the code. Please try again.",
      );
    }
    return { delivered: true };
  }
  if (env.SMS_PROVIDER === "twilio") {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM)
      throw notConfigured("Twilio keys missing");
    const auth = Buffer.from(
      `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");
    const r = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${auth}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `+${to}`,
          From: env.TWILIO_FROM,
          Body: `${code} is your Salora Glam sign-in code. It expires in 10 minutes. Do not share it.`,
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!r.ok) {
      logger.warn({ status: r.status }, "twilio send failed");
      throw new AppError(
        502,
        "SMS_FAILED",
        "Could not send the code. Please try again.",
      );
    }
    return { delivered: true };
  }
  if (isProd) throw notConfigured("SMS_PROVIDER is console");
  logger.info(
    { phone: `******${phone10.slice(-4)}`, code },
    "customer sign-in code (development: not sent)",
  );
  return { delivered: false };
}
