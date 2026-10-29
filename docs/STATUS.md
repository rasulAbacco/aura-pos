# Project status — 29 Oct 2026

**Not production-ready yet.** The core is built and tested; several required modules and all
external-provider activations remain. This page is the honest ledger.

## Verified in this build
- 97 automated server tests pass against real PostgreSQL 16 (46 unit, 51 integration).
- `server/` and `client/` install and run independently (two terminals); the optional root
  `npm run dev` runs both in one terminal; root `npm start` serves everything on one port.
- Frontend production build succeeds; a headless-Chrome smoke run (`client/e2e/screens.mjs`) logs in
  as the demo owner, bills a member with a discount, prints the receipt, opens every app page
  (incl. inventory, expenses, reports), signs in to the platform admin and opens each tab, with no
  JavaScript errors and no failed API calls.

## Done (phases 1–5, core)
- Source audit (27 prototype defects catalogued and fixed), architecture, traceability matrix.
- Schema: 38 tables, constraints for no double-booking, no negative stock, no wallet overspend.
- Auth: registration with trial, email verification, login, rotating refresh with theft detection,
  password reset, invites, session management; platform-admin principal kept separate.
- Multi-tenancy, branch scoping, role permissions with per-user grants/revokes.
- Subscription entitlements (trial / active / grace / expired read-only / suspended), Razorpay Orders
  + signature verification + idempotent webhooks, plan quotas and feature gates.
- POS: server-priced quote & checkout, split/partial payments, memberships, coupons, tips, wallet,
  idempotency, invoice/credit-note numbering, refunds, voids, parked carts, 80 mm/A4 receipts.
- Catalogue (archive not delete), inventory ledger, receipts/adjustments/transfers/valuation API.
- Clients with sensitive-field gating, wallet ledger, patch-test API, anonymisation.
- Appointments with availability, state machine, walk-ins, appointment→bill.
- Staff with masked KYC, commission ledger with rate snapshots, payout estimates.
- Expenses (void, not delete), P&L, reports with date presets, dashboard, CSV exports.
- Background jobs: renewal/trial reminders and low-stock alerts, sent once (dedupe keys), advisory-locked.
- Platform admin UI at `/platform`: salons, suspend/reactivate with reason, plans, payments, webhooks, enquiries.
- Inventory UI: stock value, reorder list, restock, adjust (damage / backbar / count) with reasons, history, suppliers.
- React app for all 7 prototype sections + dashboard, invoices, settings, subscription, auth pages.
- Public site: home, features, pricing (from DB), contact (stored, rate-limited, honeypot).

## Not done yet (next phases, in suggested order)
1. **Razorpay test-mode run** with real test keys (only a local stub was available here).
2. **More jobs**: appointment and membership-expiry reminders, webhook retry/reconciliation
   (renewal reminders and low-stock alerts are done). Request-time enforcement doesn't depend on jobs.
3. **Payroll runs** (draft → approve → paid), attendance & leave. Schema exists; no endpoints.
4. UI for: client profile page & patch tests, branch-to-branch stock transfers, purchase
   orders, platform audit-log viewer, branch creation & chairs, per-user permission editing, calendar week/month views.
5. Packages, gift cards, referral/birthday campaigns, online booking page, WhatsApp/SMS providers,
   cash shifts & reconciliation, barcode scanner input, data-export bundle.
6. Marketing: About, Services, Products, FAQ, Blog pages; lawyer-reviewed legal pages; licensed
   salon photography; self-hosted fonts; OpenAPI document at `/api/v1/docs`.
7. Playwright assertion suite for the 16-step E2E flow in the brief (harness exists).
8. Hardening: Postgres RLS, owner 2FA, error tracker, load test of checkout concurrency.

## External accounts & credentials needed to activate
Razorpay (test + live keys, webhook secret, KYC), SMTP/transactional email provider and a sending
domain with SPF/DKIM, production PostgreSQL with PITR, hosting with TLS and a domain, an error
tracker, later a WhatsApp Business/SMS provider, and a lawyer + CA review of legal pages, GST
treatment of SaaS fees and SAC/HSN codes.

## Known limitations / decisions to confirm
- One discount offer per bill (matches the prototype); stacking is not supported.
- Plan change starts immediately without proration; renewal of the same plan stacks.
- All in-person sales treated as intra-state (CGST+SGST at the branch's state).
- Membership lines can't be refunded per line; cancel the membership instead.
- P&L base pay is an estimate prorated from salary settings until payroll runs exist.
- Initial migration was generated in-sandbox (see `04-operations.md`); verify with `prisma migrate diff`.
