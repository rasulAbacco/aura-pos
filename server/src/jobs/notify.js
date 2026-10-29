/**
 * Send a notification at most once. The Notification row's unique dedupeKey is claimed first;
 * if it already exists (earlier run, other process, restart) nothing is sent again.
 * Delivery attempts and errors are recorded on the row.
 */
import { prisma, isUniqueViolation } from '../core/database/prisma.js';
import { sendEmail } from '../core/mail/mailer.js';

export async function notifyOnce({ dedupeKey, tenantId, to, subject, text, template }) {
  let row;
  try {
    row = await prisma.notification.create({ data: { dedupeKey, tenantId, channel: 'EMAIL', template, recipient: to, payload: { subject } } });
  } catch (err) {
    if (isUniqueViolation(err)) return { sent: false, duplicate: true };
    throw err;
  }
  try {
    await sendEmail({ to, subject, text });
    await prisma.notification.update({ where: { id: row.id }, data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } } });
    return { sent: true };
  } catch (err) {
    await prisma.notification.update({ where: { id: row.id }, data: { status: 'FAILED', attempts: { increment: 1 }, lastError: String(err.message).slice(0, 500) } });
    return { sent: false, error: err.message };
  }
}

/** Owners are the people who receive account-level emails. */
export const ownersOf = (tenantId) => prisma.user.findMany({ where: { tenantId, role: 'OWNER', isActive: true }, select: { email: true, name: true } });
