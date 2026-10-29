/**
 * Email delivery boundary. With SMTP_URL set, mail is sent via SMTP (any provider:
 * SES, Postmark, SendGrid SMTP relay…). Without it (development/test), messages go to an
 * in-memory outbox and the log — production startup refuses to run without SMTP_URL.
 * Raw one-time tokens appear only in the outgoing message, never in the database.
 */
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../logger/logger.js';

export const outbox = []; // dev/test only
const transport = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;

export async function sendEmail({ to, subject, text }) {
  if (!transport) {
    outbox.push({ to, subject, text, at: new Date() });
    if (outbox.length > 200) outbox.shift();
    logger.info({ to, subject }, 'email (dev outbox, not sent)');
    return { delivered: false };
  }
  await transport.sendMail({ from: env.EMAIL_FROM, to, subject, text });
  return { delivered: true };
}
