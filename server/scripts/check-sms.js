/**
 * Send one test sign-in SMS with the configured provider, to check the keys work.
 *   npm run check:sms -- 9876543210
 * Prints the provider and the result. Uses SMS_PROVIDER and its keys from server/.env (or Render env).
 * The code sent is only a test; it can't be used to sign in.
 */
import "dotenv/config";
import crypto from "node:crypto";
import { env } from "../src/config/env.js";
import { smsStatus, sendOtpSms } from "../src/core/sms/sms.js";
import { normalizeMobile } from "../src/features/customer-app/customer.phone.js";

const arg = process.argv[2];
if (!arg) {
  console.log("Usage: npm run check:sms -- <10-digit mobile number>");
  process.exit(1);
}
let phone;
try {
  phone = normalizeMobile(arg);
} catch (e) {
  console.log(e.message);
  process.exit(1);
}
const st = smsStatus();
console.log(
  `SMS provider: ${env.SMS_PROVIDER} · ready: ${st.ready ? "yes" : "NO (keys missing)"}${env.SMS_PROVIDER === "twofactor" ? ` · template: ${env.TWOFACTOR_TEMPLATE || "(2Factor default)"}` : ""}${env.SMS_PROVIDER === "smsgatewayhub" ? `\nSender: ${env.SMS_SENDER_ID || "(missing)"} · route: ${env.SMS_ROUTE || "(missing)"} · entity: ${env.SMS_ENTITY_ID ? "set" : "(missing)"} · template id: ${env.SMS_TEMPLATE_ID || "(missing)"}\nMessage: ${env.SMS_TEMPLATE_TEXT}` : ""}`,
);
const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
try {
  const r = await sendOtpSms(phone, code);
  console.log(
    r.delivered
      ? `Sent test code ${code} to +91 ${phone}.${r.sessionId ? ` 2Factor session: ${r.sessionId}` : ""}${r.jobId ? ` Job id: ${r.jobId}` : ""}`
      : `Not sent (console mode): code ${code} was only printed in the log.`,
  );
  process.exit(0);
} catch (e) {
  console.log(
    `FAILED: ${e.message.replace(/\.$/, "")} — see the log line above for the reason (e.g. "Invalid API Key", low balance, template not found, or the server can't reach the provider).`,
  );
  process.exit(1);
}
