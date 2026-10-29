# 03 — Feature Traceability Matrix

Every feature of the reference prototype mapped to its rebuilt screen, API, model and tests.
**Status** is literal: ✅ built and tested · 🟡 built, not covered by an automated test · ⬜ not built yet.
Test files: `U1` = `server/tests/unit/pricing.test.js`, `U2` = `unit/domain.test.js`, `I-auth`, `I-checkout`,
`I-tenancy` (= `tenancy-subscription.test.js`), `I-ops` (= `operations.test.js`), `I-jobs` (= `jobs.test.js`) under `server/tests/integration/`,
`E2E` = `client/e2e/screens.mjs` (visual smoke run, not yet an assertion suite).

## Prototype navigation & chrome

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Header: shop name, branch, GSTIN, live clock | `layouts/app/components/TopBar` | `GET /auth/me` | Tenant, Branch | E2E | 🟡 |
| Sidebar "Today's Sales / Bills Settled" (hard-coded in prototype) | `DashboardPage` (now real data) | `GET /reports/dashboard` | Invoice | I-ops | ✅ |
| 7 navigation tabs | `layouts/app/AppLayout` | — | — | E2E | 🟡 |

## 1. POS billing counter

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Searchable catalogue + category pills | `PosPage` | `GET /catalog/items`, `/catalog/categories` | CatalogItem, Category | E2E | 🟡 |
| Add to cart, qty ±, remove | `PosPage` | `POST /pos/quote` | — | I-checkout, E2E | ✅ |
| Stylist per line | `PosPage` | checkout `lines[].staffId` | InvoiceLine.staffId | I-checkout | ✅ |
| Client select + info pill (membership, wallet, notes) | `PosPage` | `GET /clients` | Customer, CustomerMembership | E2E | 🟡 |
| New client from POS | `NewClientModal` | `POST /clients` | Customer | I-tenancy | ✅ |
| Editable line price | `PosPage` (only with `pos.price_override`) | checkout `unitPrice` | InvoiceLine.unitPrice/listPrice, AuditLog | I-checkout | ✅ |
| Quick custom charge | `CustomChargeModal` | `type: CUSTOM` (needs `pos.custom_item`) | InvoiceLine | I-checkout | ✅ |
| Discount: membership perk | `PosPage` offer select | `offer.kind=MEMBERSHIP` | MembershipPlan | U1, I-checkout | ✅ |
| Discount: "First visit 10 %", "Flat ₹500" | coupon code (seeded FIRST10, FESTIVE500) | `offer.kind=COUPON`, `POST /pos/coupons` | Coupon | U1, I-checkout | ✅ |
| Tip | `PosPage` | `tip` | Invoice.tip, CommissionEntry(TIP) | U1, I-checkout | ✅ |
| GST calculation (single 18 %) | server engine; per-item rate, CGST/SGST/IGST | `POST /pos/quote` | CatalogItem.taxRate | U1 | ✅ |
| Payment: UPI / Card / Cash / Wallet | `PosPage` | `payments[]` | InvoicePayment, WalletEntry | I-checkout | ✅ |
| Split / partial payments (new) | `PosPage` split mode | `payments[]`, `allowPartial` | Invoice.amountDue | I-checkout | ✅ |
| Clear cart | `PosPage` | — | — | — | 🟡 |
| Bill & Print → 80 mm receipt | `ReceiptModal` (80 mm + A4) | `POST /pos/checkout` | Invoice (snapshots) | I-checkout, E2E | ✅ |
| Parked carts / interrupted-checkout recovery (new) | `PosPage` park + session draft | `/pos/parked` | ParkedCart | — | 🟡 |
| Reprint, invoice history (new) | `InvoicesPage` | `GET /invoices[/:id]` | Invoice | I-tenancy | ✅ |
| Refunds / credit notes, voids (new) | `InvoicesPage` | `/invoices/:id/refund`, `/void` | Invoice(kind CREDIT_NOTE) | I-checkout | ✅ |

## 2. Appointments & chairs

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Appointment cards with status, stylist, chair | `AppointmentsPage` | `GET /appointments` | Appointment, Resource | E2E | 🟡 |
| Book appointment / walk-in modal | `BookModal` (live free slots) | `POST /appointments`, `GET /appointments/availability` | Appointment | I-ops | ✅ |
| Send to POS checkout | "Bill" → `PosPage?appointment=` | `GET /appointments/:id/cart`, checkout `appointmentId` | Appointment.invoiceId | I-ops | ✅ |
| Conflict prevention (new) | — | Postgres EXCLUDE constraint | Appointment | I-ops | ✅ |
| Status transitions, cancel, no-show (new) | `AppointmentsPage` | `POST /appointments/:id/status`, `/reschedule` | Appointment | I-ops | ✅ |
| Calendar week/month views | — | — | — | — | ⬜ |
| Reminders | — | — | Notification | — | ⬜ |

## 3. Client CRM

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Client table + search | `ClientsPage` | `GET /clients?q=` | Customer | I-tenancy | ✅ |
| Colour formula / skin notes | `ClientsPage`, `NewClientModal` | `customers.sensitive` gating | Customer.colorFormula/allergies | I-checkout | ✅ |
| Patch test log (prototype hard-coded "Passed") | API only | `POST /clients/:id/patch-tests` | PatchTest | — | 🟡 (no UI yet) |
| Wallet balance | `WalletModal` with ledger | `GET/POST /clients/:id/wallet` | WalletEntry | I-checkout | ✅ |
| Visits count | `ClientsPage` | derived at checkout/void | Customer.visitCount | I-checkout | ✅ |
| "Bill Client" | `ClientsPage` → POS | — | — | — | 🟡 |
| Duplicate detection, erasure (new) | form error | `POST /clients` (409), `/anonymize` | Customer | — | 🟡 |
| Client profile page with history | — | `GET /clients/:id` (built) | — | — | ⬜ UI |

## 4. Memberships

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Plan cards | `MembershipsPage` | `GET /memberships/plans` | MembershipPlan | I-checkout | ✅ |
| Create plan modal | `PlanModal` | `POST /memberships/plans` | MembershipPlan | I-checkout | ✅ |
| Bill this membership (prototype didn't enrol) | → `PosPage?membership=` | checkout `type: MEMBERSHIP` | CustomerMembership, WalletEntry(BONUS) | I-checkout | ✅ |
| Active member directory | `MembershipsPage` | `GET /memberships/members` | CustomerMembership | — | 🟡 |
| Packages, gift cards | — | — | — | — | ⬜ |

## 5. Service price list & stock

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Catalogue table | `CatalogPage` | `GET /catalog/items` | CatalogItem, StockLevel | I-ops | ✅ |
| Add service/product | `ItemModal` | `POST /catalog/items` | CatalogItem, StockMovement(OPENING) | I-checkout | ✅ |
| Edit (modal missing in prototype) | `ItemModal` | `PATCH /catalog/items/:id` | CatalogItem, AuditLog | I-tenancy | ✅ |
| Delete (modal missing; now archive) | `CatalogPage` | `/archive`, `/restore` | CatalogItem.archivedAt | — | 🟡 |
| Restock modal | `RestockModal` | `POST /inventory/receipts` | StockMovement(RECEIPT) | I-checkout | ✅ |
| Low-stock badge | `CatalogPage`, dashboard | `GET /inventory/low-stock` | — | I-ops | ✅ |
| Adjustments, damage, backbar, valuation, suppliers, movement history (new) | `InventoryPage` (+ `AdjustStockModal`, `MovementsModal`, `SuppliersPanel`) | `/inventory/*` | StockMovement, Supplier | I-ops (adjust), I-tenancy (transfer gate), E2E | ✅ |
| Branch-to-branch transfers | API only | `POST /inventory/transfers` | StockMovement | I-tenancy | 🟡 (no UI) |
| Purchase orders | — | — | — | — | ⬜ |

## 6. Staff & documents

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Employee directory cards, phone, WhatsApp link | `StaffPage` | `GET /staff` | StaffProfile | I-tenancy | ✅ |
| Add employee (KYC, bank, salary, commission) | `StaffModal` (KYC masked) | `POST /staff` (+ quota) | StaffProfile | I-tenancy | ✅ |
| Edit salary & commission | `StaffModal` | `PATCH /staff/:id` (audited) | StaffProfile, AuditLog | — | 🟡 |
| KYC dossier | masked fields in `StaffPage` | `GET /staff/:id` (`staff.kyc`, audited) | StaffProfile | — | 🟡 |
| Payroll & commission ledger | `StaffPage` ledger tab | `GET /reports/staff-ledger`, CSV | CommissionEntry | I-ops | ✅ |
| Payroll runs, approval, payouts, attendance/leave | — | — | PayrollRun, PayrollLine (schema only) | — | ⬜ |

## 7. Profit & loss

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| 5 KPI cards | `PnlPage` | `GET /pnl` | Invoice*, CommissionEntry, Expense | U2, I-ops | ✅ |
| Bar chart, doughnut | `PnlPage` (Recharts) | same | — | E2E | 🟡 |
| Statement A − B − C | `PnlPage` | same | — | U2 (prototype regression), I-ops | ✅ |
| Expense registry, add, delete | `ExpensesPage`, `ExpenseModal`, `VoidExpenseModal` (void, not delete) | `/expenses` | Expense | I-ops | ✅ |
| Print statement (blank in prototype) | `PnlPage` print area | — | — | — | 🟡 |
| Date filters, presets, CSV (new) | `PnlPage`, `ReportsPage` | `?from&to`, `/reports/export/*.csv` | — | I-ops, E2E | ✅ |

## Shop profile & tax modal

| Prototype feature | React screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Name, branch, tagline, GSTIN, tax rate, phone, UPI, address | `SettingsPage` | `PATCH /settings/profile`, `/settings/branches/:id` | Tenant, Branch | — | 🟡 |

## SaaS layer (new, required by brief)

| Feature | Screen | API | Model(s) | Tests | Status |
|---|---|---|---|---|---|
| Register, verify email, login, refresh rotation, logout, reset | `features/auth/*Page.jsx` | `/auth/*` | User, Session, OneTimeToken | I-auth | ✅ |
| Roles + granular permissions | `SettingsPage` team section | `/users/*` | User.permissionGrants/Revokes | U2, I-checkout | ✅ |
| Tenant isolation | — | all | tenantId everywhere | I-tenancy | ✅ |
| Entitlements: trial, grace, expired read-only, suspended | `layouts/app` EntitlementBanner | middleware | Subscription | U2, I-tenancy | ✅ |
| Razorpay order → verify → activate; webhooks | `SubscriptionPage` | `/billing/*`, `/webhooks/razorpay` | PaymentTransaction, WebhookEvent | U2, I-tenancy | ✅ (against a local stub; not yet against Razorpay test mode) |
| Platform admin (tenants, suspend/reactivate, plans, payments, webhooks, enquiries) | `features/platform-admin` at `/platform` | `/platform/*` | PlatformAdmin, AuditLog | I-auth, I-tenancy, E2E | ✅ |
| Marketing site | `features/website/*` (home, features, pricing, contact, legal placeholders) | `/public/plans`, `/public/contact` | ContactSubmission | — | 🟡 About/Services/Products/Blog/FAQ pages ⬜ |
| Background jobs (renewal reminders, low-stock alerts) | — | `server/src/jobs` | Notification | I-jobs | ✅ (email only) |
| OpenAPI docs | — | — | — | — | ⬜ |
