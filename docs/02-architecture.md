# 02 — Architecture Plan & Decisions

## 1. Shape: modular monolith

One Express API and one React SPA, in two independent folders (`server/`, `client/`) that each
install and run on their own. Microservices would add network failure modes to the checkout
transaction for no benefit at this scale; feature folders keep boundaries clear so a module can
be extracted later.

**Rule:** feature-specific code lives inside its feature folder; code used by two or more features
lives in a shared folder (`client/src/{components,hooks,contexts,lib,utils}`, `server/src/core`).
A feature imports another feature only through that feature's `index.js`.

```
server/src/
  app.js, server.js               middleware + route registration; process start
  config/                         env validation (zod) — process exits on invalid config
  core/{database,errors,logger,mail,money,utils,middleware}/   shared plumbing
  integrations/razorpay/          order client, signatures, webhook route + handler
  jobs/                           scheduler, renewal reminders, low-stock alerts
  features/<name>/                <name>.routes.js · .controller.js · .service.js · .validation.js
                                  (+ pure calculation files: pos.pricing.js, pnl.calculations.js, …)
server/tests/{unit,integration,helpers}/

client/src/
  app/                            App.jsx, providers.jsx, router.jsx (composes each feature's routes)
  features/<name>/                <Name>Page.jsx · <name>.routes.jsx · index.js
                                  + components/ hooks/ utils/ used only by that feature
  components/{ui,forms,tables,charts,modals,receipt}/   shared UI
  layouts/{app,site}/             logged-in shell, public website shell
  hooks/ contexts/ lib/ utils/ assets/ styles/
```

Pure business logic (pricing, entitlements, commission, P&L) has no I/O, so it is unit-tested
without a database; it lives inside the feature that owns it.

## 2. Selected versions (pinned in package.json)

| Package | Version | Why |
|---|---|---|
| Node.js | ≥ 22 LTS | native `fetch`, stable ESM |
| express | 5.x | async errors propagate to the error handler without wrappers |
| prisma / @prisma/client / @prisma/adapter-pg | 7.10.x | current stable; driver adapter (node-postgres) — no native query engine to download |
| decimal.js | 10.x | exact decimal money arithmetic |
| zod | 4.x | request + env validation, shared mental model with the frontend |
| jsonwebtoken | 9.x | short-lived access tokens |
| @node-rs/argon2 | 2.x | Argon2id password hashing, prebuilt binaries |
| helmet, cors, express-rate-limit, cookie-parser, pino | current | security headers, CORS allow-list, brute-force limits, structured logs |
| (jobs) | — | in-process scheduler + Postgres advisory locks + Notification dedupe keys; no Redis to operate |
| vitest + supertest | 4.x / 7.x | unit + HTTP integration tests |
| Playwright | 1.x | browser E2E (planned) |
| react / react-router-dom / vite / tailwindcss | 19 / 7 / 8 / 4 | per mandated stack |
| react-hook-form + zod, axios, recharts, react-icons | current | per mandated stack |

## 3. Multi-tenancy

Shared database, shared schema, `tenantId` column on every tenant-owned row.

- The tenant id is **never read from the request body or URL**. It comes only from the verified
  access token (`req.ctx.tenantId`), and every service function takes `ctx` as its first argument.
- Lookups by id always use `findFirst({ where: { id, tenantId } })` — a foreign id returns 404,
  not 403, so existence of other tenants' records is not disclosed.
- Composite foreign keys are not used (Prisma ergonomics); instead child writes re-verify parent
  ownership in the same transaction.
- Branch scope: users carry `branchIds`; owners have all branches. Branch-scoped endpoints check
  membership.
- Defence-in-depth option (documented, not yet enabled): Postgres Row-Level Security keyed on
  `SET LOCAL app.tenant_id`. Integration tests assert isolation at the API layer today.

## 4. Identity, sessions, authorization

- Two principal types: `PlatformAdmin` (separate table, separate token audience `platform`) and
  `User` (tenant users, audience `tenant`). A tenant token can never satisfy a platform route.
- Passwords: Argon2id. Login rate-limited per IP and per email.
- Access token: JWT, 15 min, held in memory by the SPA, sent as `Authorization: Bearer`.
- Refresh token: 256-bit random, stored **hashed** in `Session`, delivered as `HttpOnly; Secure;
  SameSite=Strict` cookie scoped to `/api/v1/auth`. Rotated on every use; reuse of a rotated token
  revokes the whole session family (theft detection). Refresh requires header `X-Requested-With`
  as a CSRF guard. Because state-changing API calls use a bearer header (not cookies), they are
  not CSRF-able.
- Every request re-loads user status + session validity cheaply (session id in token) so a
  disabled user or revoked session loses access within one request, not at token expiry.
- RBAC: roles map to default permission sets (`features/users/users.permissions.js`); per-user `grants` /
  `revokes` overrides allow the owner to fine-tune. `requirePermission('pos.discount')` middleware.

## 5. Subscription entitlement state machine

States: `TRIAL → ACTIVE → PAST_DUE → GRACE → EXPIRED`, plus `CANCELLED` (runs to period end) and
tenant-level `SUSPENDED` (admin, overrides everything).

`evaluateEntitlement({ tenant, subscription, plan, now })` is a pure function evaluated **on every
request** (never cached across requests, never dependent on cron):

| Effective state | Reads | Business writes | Billing/renewal routes | Exports |
|---|---|---|---|---|
| TRIAL / ACTIVE | ✔ | ✔ (within plan features/quotas) | ✔ | ✔ |
| GRACE (period ended, ≤ graceDays) | ✔ | ✔ + warning banner | ✔ | ✔ |
| EXPIRED | ✔ (read-only) | ✘ 402 `SUBSCRIPTION_EXPIRED` | ✔ | ✔ |
| CANCELLED before period end | as ACTIVE | as ACTIVE | ✔ | ✔ |
| SUSPENDED | ✘ 423 except subscription + export | ✘ | view only | ✔ owner only |

Writes are gated by `requireWritable(feature?)` middleware; quotas (staff, branches) are checked
inside services. Payment success never lifts a suspension.

## 6. Financial definitions (single source of truth: `features/pos/pos.pricing.js`, `features/pnl/pnl.calculations.js`)

- Money: `NUMERIC(14,2)`; all arithmetic in `decimal.js`; rounding HALF_UP to paise per line,
  optional invoice round-off to nearest rupee recorded as its own field.
- Discounts allocated per line pro-rata to eligible line value (membership discount applies only
  to categories the plan lists — default services only, fixing D9's ambiguity explicitly).
- Tax: per catalogue item `taxRate` (0 allowed) and `taxInclusive` per tenant. Intra-state → CGST
  = SGST = rate/2; inter-state → IGST. Tip is not taxed and is not revenue (liability to staff).
- **Revenue (P&L)** = Σ invoice line net amounts ex-tax, after discounts, minus credit notes.
  Membership revenue = membership line net. **Wallet top-ups are a liability**, not revenue;
  wallet *redemption* is a payment method, so revenue is recognised once, at the sale. GST
  collected is excluded (it is owed to government).
- **Commission** = net line amount × rate snapshotted on the commission ledger row at sale time;
  reversed on refund.
- **Payroll cost** in P&L = approved payroll entries in period when available; otherwise base
  salaries pro-rated to the period (clearly labelled "estimated").
- The P&L is an operational management report, not statutory accounts.

## 7. Checkout transaction

`POST /api/v1/pos/checkout` with `Idempotency-Key` header. In one `SERIALIZABLE`-safe transaction:
entitlement + permission check → reload catalogue prices → price via pure engine → validate
discount eligibility & payments sum → `UPDATE stock SET qty = qty − n WHERE qty ≥ n` (0 rows ⇒
409) → next invoice number via `UPDATE … RETURNING` on branch counter → insert invoice + immutable
lines + payments → conditional wallet debit + ledger row → stock movement rows → commission rows →
membership enrolment for membership lines → commit. Unique `(tenantId, idempotencyKey)` makes
retries return the original invoice instead of creating a second one.

## 8. Razorpay (SaaS billing only)

1. `POST /billing/orders` — server computes amount from the plan row, creates a Razorpay Order
   (REST, basic auth with key id + secret, server-side only), stores `PaymentTransaction(PENDING)`.
2. Browser runs Razorpay Checkout with the **public** key id + order id.
3. `POST /billing/verify` — HMAC-SHA256(`order_id|payment_id`, key_secret) compared in constant
   time; amount/currency/tenant cross-checked against the stored order; marks `CAPTURED` and
   extends the subscription — idempotent on `payment_id` unique constraint.
4. `POST /webhooks/razorpay` — raw body, `X-Razorpay-Signature` = HMAC-SHA256(body, webhook_secret);
   events stored with unique `x-razorpay-event-id`; duplicate → 200 no-op. Handled:
   `payment.captured`, `order.paid` (activate/extend), `payment.failed` (mark failed, notify),
   `refund.processed` (record refund). Whichever of verify/webhook arrives first activates; the
   second is a no-op.

POS customer payments (cash/UPI/card) are *recorded*, not collected, and never touch Razorpay.

## 9. API conventions

`/api/v1/...`; JSON; success `{ data, meta? }`; error `{ error: { code, message, details?, requestId } }`;
list endpoints `?page=&pageSize=&q=&sort=`; 400 validation, 401 auth, 402 subscription, 403 permission,
404 not-found-or-not-yours, 409 conflict, 423 suspended, 429 rate limit. OpenAPI at `/api/v1/docs`
(planned, see STATUS).

## 10. Testing strategy

- Unit (no DB): pricing/GST/rounding, discount eligibility, entitlement transitions, commission,
  P&L, Razorpay signature.
- Integration (real Postgres `aura_test`, migrations applied): auth + refresh rotation/reuse,
  tenant isolation, permissions, checkout atomicity, idempotency, oversell, wallet overspend,
  expiry blocks writes but allows reads, suspension, webhook idempotency.
- E2E (Playwright): the 16-step flow in the brief — planned.
