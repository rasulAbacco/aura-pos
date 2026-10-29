import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './core/database/prisma.js';
import { logger } from './core/logger/logger.js';
import { startScheduler } from './jobs/scheduler.js';

const app = createApp();
if (env.RUN_JOBS) startScheduler();
const server = app.listen(env.PORT, () => logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Aura POS API listening'));

// Graceful shutdown: stop accepting, let in-flight requests finish, then close the pool.
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 15000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
