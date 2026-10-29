# 05 — Security & Privacy Notes

Controls implemented (and where they are tested):

| Area | Control | Test |
|---|---|---|
| Passwords | Argon2id (OWASP parameters), 10-char minimum, dummy-hash timing on unknown emails | I-auth |
| Sessions | 15-min JWT in memory; HttpOnly SameSite=Strict refresh cookie, hashed at rest, rotated on use; reuse revokes the family; per-request session check so logout/disable/suspension take effect immediately | I-auth, I-tenancy |
| CSRF | API writes use bearer tokens (not cookies); the cookie-based refresh/logout require `X-Requested-With` | I-auth |
| Tenant isolation | tenantId only from the verified session; every lookup scoped; foreign ids → 404; body tenantId ignored | I-tenancy |
| Authorization | Server-side permission per route; owner can grant/revoke per user | U2, I-checkout |
| Subscription | Entitlement evaluated per request from the DB; payment never lifts a suspension | U2, I-tenancy |
| Payments | Secrets server-only; HMAC verification (constant-time) for checkout and raw-body webhooks; idempotent event store; amount/currency/tenant cross-checks | U2, I-tenancy |
| Financial integrity | Decimal arithmetic, NUMERIC columns, immutable invoice snapshots, idempotency keys, conditional stock/wallet updates + CHECK constraints, DB exclusion constraint for bookings | U1, I-checkout, I-ops |
| Input | zod validation on every body/query; 200 kB body limit; malformed UUID → 404 | I-tenancy |
| Output | React escaping (no `dangerouslySetInnerHTML`); CSV formula-injection neutralised | I-ops |
| Headers | helmet defaults, explicit CORS allow-list | — |
| Rate limiting | login, register, reset, contact, platform login | — (limits raised in tests) |
| Audit | price overrides, voids, refunds, wallet adjustments, compensation changes, KYC views, suspensions, payments | I-checkout, I-tenancy |
| Logging | no headers/cookies/bodies; credential-like fields redacted | — |

**Personal data minimisation.** The prototype stored full Aadhaar, PAN and bank account numbers in clear
text. The rebuild stores only Aadhaar last 4 digits (per UIDAI masking guidance), a masked PAN and the
last 4 of the account number. If full KYC documents are genuinely required, store scans in private
object storage (the `StoredFile` model is ready; upload endpoints are not built) behind `staff.kyc`.
Client allergies/colour formulas are hidden from roles without `customers.sensitive`.

**Erasure.** `POST /clients/:id/anonymize` scrubs a client's profile and patch tests. Issued invoices keep
their customer snapshot because GST law requires invoices to be retained; document this in the privacy policy.

**Not claimed.** No compliance certification (DPDP Act 2023, PCI, ISO 27001) is claimed. Card data never
touches this system (Razorpay Checkout handles it). Outstanding: database-level Row-Level Security as a
second isolation layer, 2FA for owners and platform admins, dependency scanning in CI beyond `npm audit`,
a penetration test, and lawyer-reviewed Privacy/Terms/Refund pages (currently placeholders).
