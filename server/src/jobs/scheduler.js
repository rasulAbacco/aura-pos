/**
 * Minimal in-process scheduler. Each job runs on an interval; a Postgres advisory lock makes sure
 * only one server instance runs a given job at a time. Jobs are idempotent (see notify.js), so
 * restarts and overlapping instances never send duplicates.
 */
import { prisma } from '../core/database/prisma.js';
import { logger } from '../core/logger/logger.js';
import { runRenewalReminders } from './renewalReminders.job.js';
import { runLowStockAlerts } from './lowStockAlerts.job.js';

export const JOBS = [
  { name: 'renewal-reminders', lockId: 7301, everyMin: 60, run: runRenewalReminders },
  { name: 'low-stock-alerts', lockId: 7302, everyMin: 60, run: runLowStockAlerts },
];

export async function runJobOnce(job) {
  const [{ locked }] = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${job.lockId}) AS locked`;
  if (!locked) return { skipped: 'another instance is running it' };
  try {
    const result = await job.run();
    logger.info({ job: job.name, result }, 'job finished');
    return result;
  } catch (err) {
    logger.error({ job: job.name, err }, 'job failed');
    return { error: err.message };
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${job.lockId})`;
  }
}

export function startScheduler() {
  const timers = JOBS.map((job) => {
    const tick = () => runJobOnce(job);
    setTimeout(tick, 30000).unref(); // first run shortly after start-up
    return setInterval(tick, job.everyMin * 60000);
  });
  timers.forEach((t) => t.unref());
  logger.info({ jobs: JOBS.map((j) => j.name) }, 'scheduler started');
  return () => timers.forEach(clearInterval);
}
