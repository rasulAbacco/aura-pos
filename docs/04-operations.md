# 04 — Setup, Deployment & Operations

## Local development

Requirements: Node ≥ 22, PostgreSQL 16 (with the `btree_gist` extension, bundled with Postgres).

```bash
createdb aura_dev && createdb aura_test

# Terminal 1 — API (Express, port 4000)
cd server
npm install
npm run setup     # .env with a random JWT secret, Prisma client, migrations, demo data
npm run dev

# Terminal 2 — website + app (Vite, port 5173)
cd client
npm install
npm run setup     # copies .env.example → .env  (VITE_API_BASE_URL=http://localhost:4000/api/v1)
npm run dev

# Tests (in server/)
npm test          # 97 tests: unit + integration against the aura_test database
```

`client/.env` → `VITE_API_BASE_URL=http://localhost:4000/api/v1`; `server/.env` → `PORT=4000`, `DATABASE_URL`,
`CLIENT_ORIGIN=http://localhost:5173` (the only origin CORS allows, with credentials).

**Optional, one terminal:** from the repo root, `npm install` installs both folders, `npm run setup` sets both up and
`npm run dev` starts both together (concurrently). Nothing else depends on the root `package.json`.

`npm start` (repo root) is the one-process production mode: it builds `client/dist` with `VITE_API_BASE_URL=/api/v1`
(`client/.env.single`) and the API serves it
(`SERVE_CLIENT=true`) alongside `/api` on a single port, so no separate web server is required.
A reverse proxy in front for TLS is still recommended.

Demo logins after seeding: `owner@auraluxe.demo / DemoOwner-2026!`, `frontdesk@auraluxe.demo / DemoDesk-2026!`,
platform admin `admin@aura.local / ChangeMe-Admin-2026!` (override with `SEED_ADMIN_EMAIL/PASSWORD`). Never seed production.

### Note on migrations (read this)
The build sandbox could not download Prisma's native schema engine (`binaries.prisma.sh` was blocked).
So the initial migration `prisma/migrations/20261028000000_init/migration.sql` was generated from
Prisma's own DMMF by `server/scripts/build-migration.js` using Prisma's naming conventions, plus the
hand-written constraints in `prisma/sql/constraints.sql`, and applied with `server/scripts/migrate.js`,
which writes Prisma-compatible rows to `_prisma_migrations`. A schema-drift test checks every model
field exists in the database. **On a normal machine, before the first deploy, run**

```bash
cd server && npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script
```

It should print nothing material (CI does this with `--exit-code`). From then on use the normal
`prisma migrate dev --name <change>` workflow and `prisma migrate deploy` in production.

## Environment variables

See `server/.env.example`. The server validates them at start-up (zod) and **refuses to start in
production** if `COOKIE_SECURE` isn't true, `CLIENT_ORIGIN` isn't https, the JWT secret looks like a dev
value, or Razorpay/SMTP settings are missing. The frontend has **no secrets**: the only Razorpay value
the browser sees is the public key id, returned by the API when an order is created. Never put
secrets in `VITE_*` variables.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (use `sslmode=require` on managed DBs) |
| `PORT` | API port (4000) |
| `CLIENT_ORIGIN` | React app origin — the only CORS-allowed origin, used in email links |
| `JWT_ACCESS_SECRET` | HS256 signing key for 15-minute access tokens |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh session lifetime (rotated on every use) |
| `COOKIE_SECURE`, `TRUST_PROXY` | `true` / number of proxy hops in production |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | SaaS plan payments |
| `SIGNUP_TRIAL_PLAN_CODE` | Plan used for new sign-up trials (`trial`) |
| `SMTP_URL`, `EMAIL_FROM` | Transactional email (verification, reset, invites) |
| `RUN_JOBS` | `true` → reminders and low-stock alerts run inside the API process (or run `npm run jobs` from cron) |
| `SERVE_CLIENT` | `true` → the API also serves the built React client (single-port production) |
| `LOG_LEVEL` | pino level |
| `VITE_API_BASE_URL` (client/.env) | Public API address the browser calls. Not a secret. |

## Production topology

Either run `npm start` (the API serves `client/dist` itself, `SERVE_CLIENT=true`) behind a TLS proxy, or let the
proxy serve `client/dist` and forward `/api` to the Node API on the same origin — this keeps the `SameSite=Strict` refresh cookie working without cross-site cookies.

- API: `node server/src/server.js` behind a process manager (systemd / container), ≥ 2 instances.
  Health: `GET /health` (liveness), `GET /ready` (checks DB). SIGTERM drains in-flight requests.
- SPA: static files; add `Content-Security-Policy` allowing `script-src 'self' https://checkout.razorpay.com`,
  `frame-src https://api.razorpay.com https://checkout.razorpay.com`, and Google Fonts (or self-host fonts).
- Database: managed PostgreSQL 16, automated daily snapshots + point-in-time recovery.

Deploy sequence: build → `prisma migrate deploy` → start new API version → switch traffic → stop old.
Rollback: redeploy the previous build. Migrations must be backward-compatible with the previous
release (expand → migrate → contract) so a code rollback never needs a schema rollback.

## Razorpay setup

1. Create a Razorpay account; complete KYC for live mode. Use **test mode keys** (`rzp_test_…`) in dev/staging.
2. Put key id/secret in `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. Dashboard → Webhooks → add `https://<your-domain>/api/v1/webhooks/razorpay`, set a secret
   (→ `RAZORPAY_WEBHOOK_SECRET`), and subscribe to `payment.captured`, `order.paid`, `payment.failed`,
   `refund.processed`.
4. Create plans in the platform admin API (`POST /api/v1/platform/plans`). Prices are charged as entered
   (treat them as GST-inclusive and issue the SaaS GST invoice accordingly — confirm with your CA).
5. In test mode, pay with Razorpay's test cards/UPI and confirm the subscription activates via both
   the checkout callback and the webhook (whichever arrives first applies; the other is a no-op).

What the integration does today: one-off **Orders** per period (renewal = new order), not Razorpay's
recurring Subscriptions API. Auto-debit renewals would be a later change.

## Backups & recovery

- Rely on the managed database's PITR plus a nightly logical dump: `pg_dump -Fc "$DATABASE_URL" > aura_$(date +%F).dump`, stored encrypted off-site, 30-day retention.
- **Test restores monthly**: `createdb aura_restore && pg_restore -d aura_restore aura_YYYY-MM-DD.dump`, then point a staging API at it and run `GET /ready` plus a P&L report.
- Tenant data export for customers: invoices/expenses/staff CSVs from Reports (available even when the subscription is expired).

## Logging & monitoring

Structured JSON logs (pino) with a request id on every line and in the `x-request-id` response header;
no headers, bodies, cookies or query strings are logged. Alert on: `/ready` failures, 5xx rate,
`WebhookEvent.status = FAILED` (visible at `GET /api/v1/platform/webhooks?status=FAILED`), and
login-failure spikes (`AuditLog.action = auth.login_failed`). Add an error tracker (e.g. Sentry) in
`app.js`'s error handler — not wired yet.
