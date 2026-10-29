#!/usr/bin/env node
/**
 * Fallback migration runner, compatible with Prisma's `_prisma_migrations` bookkeeping
 * (same table shape and sha256 checksum), so `prisma migrate deploy` later treats these
 * migrations as already applied.
 *
 * Production should use `npx prisma migrate deploy`. This exists because the Prisma
 * schema-engine binary could not be downloaded in the build sandbox, and it is also used
 * by the integration test setup.
 *
 * Usage: DATABASE_URL=... node scripts/migrate.js
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../prisma/migrations');

export async function migrate(databaseUrl = process.env.DATABASE_URL, { log = console.log } = {}) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0)`);
    // Serialise concurrent runners (e.g. parallel test workers).
    await client.query('SELECT pg_advisory_lock(72707370)');
    const applied = new Map(
      (await client.query('SELECT migration_name, checksum FROM "_prisma_migrations" WHERE rolled_back_at IS NULL AND finished_at IS NOT NULL'))
        .rows.map((r) => [r.migration_name, r.checksum]),
    );
    const names = fs.readdirSync(dir).filter((n) => fs.statSync(path.join(dir, n)).isDirectory()).sort();
    for (const name of names) {
      const sql = fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      if (applied.has(name)) {
        if (applied.get(name) !== checksum) throw new Error(`Migration ${name} was modified after being applied (checksum mismatch)`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
           VALUES ($1, $2, now(), $3, 1)`,
          [crypto.randomUUID(), checksum, name],
        );
        await client.query('COMMIT');
        log(`applied ${name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${name} failed: ${err.message}`);
      }
    }
    await client.query('SELECT pg_advisory_unlock(72707370)');
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate().then(() => console.log('migrations up to date'), (e) => { console.error(e.message); process.exit(1); });
}
