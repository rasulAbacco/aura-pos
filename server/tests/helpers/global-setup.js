// Prepares the integration test database (migrations) once per run.
// Unit tests do not touch it but the setup is cheap and idempotent.
import { migrate } from '../../scripts/migrate.js';

export default async function setup() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://aura:aura@localhost:5432/aura_test';
  await migrate(process.env.DATABASE_URL, { log: () => {} });
}
