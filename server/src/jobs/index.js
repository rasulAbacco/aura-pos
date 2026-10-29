#!/usr/bin/env node
/**
 * Run every job once and exit:  npm run jobs
 * Use this from an external scheduler (cron, a hosting platform's scheduled task) if you prefer
 * that to RUN_JOBS=true, which runs them inside the API process.
 */
import { prisma } from '../core/database/prisma.js';
import { JOBS, runJobOnce } from './scheduler.js';

for (const job of JOBS) console.log(job.name, await runJobOnce(job));
await prisma.$disconnect();
