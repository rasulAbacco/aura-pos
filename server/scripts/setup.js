#!/usr/bin/env node
/**
 * One-time local setup, run inside server/:  npm run setup   (or from the repo root: npm run setup)
 *  1. creates .env from .env.example with a fresh random JWT secret (if missing)
 *  2. generates the Prisma client
 *  3. applies database migrations
 *  4. loads demo data (development only)
 * Needs PostgreSQL running and the DATABASE_URL in server/.env pointing at an existing database.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let step = '';
const run = (cmd, label) => { step = label; console.log(`\n› ${label}: ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };
process.chdir(fileURLToPath(new URL('..', import.meta.url))); // always run from server/

if (!fs.existsSync('.env')) {
  const example = fs.readFileSync('.env.example', 'utf8');
  fs.writeFileSync('.env', example.replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET=${crypto.randomBytes(48).toString('base64url')}`));
  console.log('Created server/.env (check DATABASE_URL before continuing if setup fails).');
}

try {
  run('npx prisma generate', 'Generating database client');
  run('node scripts/migrate.js', 'Applying migrations');
  run('node prisma/seed.js', 'Loading demo data');
  console.log('\nDone. Start the API:  npm run dev   (in server/)   and the website:  npm run dev   (in client/)');
  console.log('Then open http://localhost:5173  (demo login: owner@auraluxe.demo / DemoOwner-2026!)');
} catch {
  console.error(`\nSetup stopped at "${step}".`);
  if (step === 'Generating database client') console.error('Prisma could not download its engine. Check your internet connection or proxy, then run npm run setup again.');
  else console.error('Check that PostgreSQL is running and DATABASE_URL in server/.env points to an existing database.');
  process.exit(1);
}
