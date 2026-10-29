# 01 — Source Audit of `profit_loss_ledger_with_graphs (1).html`

The prototype (copied to `docs/reference-prototype.html`) is a single-file, client-only
mock: ~2,400 lines, Tailwind via CDN, Font Awesome via CDN, Chart.js (unpinned) and
79 JavaScript functions operating on one in-memory `STATE` object. **Nothing persists**:
a page refresh discards every bill, client, expense and stock change. It is treated here
as a functional and visual specification, not as working software.

## 1. Navigation sections

| # | Tab id | Label | Sub-views |
|---|--------|-------|-----------|
| 1 | `pos` | Billing Counter | catalogue grid + cart/checkout pane |
| 2 | `appointments` | Queue & Chairs | appointment cards |
| 3 | `clients` | Client CRM & Logs | searchable client table |
| 4 | `memberships` | Memberships | plan cards + active member directory |
| 5 | `catalog-mgmt` | Service Price List | catalogue table with restock/edit/delete/+bill |
| 6 | `staff` | Staff & Documents | Employee Directory & KYC · Salary & Commission Payroll Ledger |
| 7 | `pnl` | Profit & Loss Ledger | KPI cards, bar chart, doughnut, statement, expense registry |

Persistent chrome: header (shop name, branch pill, live clock, GSTIN; buttons *New Service/Price*,
*Shop Profile & Tax*, *+ Staff*, *New Client*) and sidebar footer (*Today's Sales*, *Bills Settled*,
*Shop Profile & Tax*).

## 2. Modals and forms (12 defined, 2 missing)

| Modal | Fields | Save handler |
|-------|--------|--------------|
| Record Business Expense | title*, category (8), amount*, date, payment mode (Bank/UPI/Cash/Credit Card), notes | `saveNewExpense` |
| Shop Profile & Branding | name*, branch, tagline, GSTIN, default tax %, phone*, UPI ID, address | `saveShopProfile` |
| Add New Service / Retail Item | name*, type (service/product), category (Hair/Skin & Spa/Nails/Retail), price*, duration *or* initial stock, icon (7), "add to bill" checkbox | `saveNewService` |
| Quick Custom Charge | description*, price*, stylist | `addQuickCustomCharge` |
| Register New Client | name*, phone*, membership plan, initial wallet, formula/skin notes | `saveNewClient` |
| Create Membership Plan | name*, price*, discount %, bonus wallet, validity months, perks | `saveNewMembershipPlan` |
| New Chair Booking / Walk-in | client, stylist, service, free-text time, free-text chair | `saveNewAppointment` |
| Add New Employee | name*, role (6), phone*, WhatsApp*, Aadhaar*, PAN*, address*, bank, account no, IFSC, base salary, frequency (Monthly/Weekly/Daily), service comm %, retail comm % | `saveNewEmployee` |
| Edit Salary & Commissions | base salary, frequency, service %, retail % | `saveSalaryCommissionChanges` |
| Restock / Add Inventory | product, add qty, supplier/batch note | `saveRestockQuantity` |
| Employee Dossier & KYC | read-only full KYC, bank, address | — |
| Thermal Receipt (80 mm) | read-only printable slip | `window.print` |
| **Edit Service** | *referenced by JS, absent from DOM* | `saveEditService` — **throws** |
| **Delete Service** | *referenced by JS, absent from DOM* | `executeDeleteService` — **throws** |

## 3. JavaScript functions (79), grouped

- **Shell:** `switchTab`, `startLiveClock`, `showAppNotification`, `switchStaffSubTab`.
- **POS:** `renderCatalog`, `setCategory`, `filterCatalog`, `addToCartById`, `addToCart`, `renderCart`,
  `updateCartQty`, `removeCartItem`, `updateCartStaff`, `updateCartItemPrice`, `clearCart`,
  `calculateCartTotals`, `setPaymentMethod`, `completeCheckout`, `closeReceiptModal`,
  `openQuickCustomModal`/`close…`/`addQuickCustomCharge`.
- **Clients:** `populateClientSelect`, `onClientSelected`, `updateClientInfoPill`, `renderClientsList`,
  `selectClientForPOS`, `openNewClientModal`/`close…`/`saveNewClient`.
- **Memberships:** `renderMembershipsView`, `billMembershipPlan`, `openNewPlanModal`/`close…`/`saveNewMembershipPlan`.
- **Catalogue & stock:** `renderCatalogManagementTable`, `openNewServiceModal`/`close…`/`saveNewService`,
  `toggleServiceTypeFields`, `openEditServiceModal`, `toggleEditServiceTypeFields`, `closeEditServiceModal`,
  `saveEditService`, `openDeleteServiceModal`, `closeDeleteServiceModal`, `executeDeleteService`,
  `openRestockModal`, `onRestockProductChange`, `closeRestockModal`, `saveRestockQuantity`.
- **Appointments:** `renderAppointments`, `sendAppointmentToBilling`, `openNewAppointmentModal`/`close…`/`saveNewAppointment`.
- **Staff:** `renderStaffDirectory`, `renderStaffCommissions`, `viewEmployeeDetails`, `closeViewEmployeeModal`,
  `openNewEmployeeModal`/`close…`/`saveNewEmployee`, `copyPhoneToWhatsapp`, `formatAadhaarInput`,
  `openEditSalaryModal`/`close…`/`saveSalaryCommissionChanges`.
- **P&L:** `calculatePnLSummary`, `renderPnLView`, `renderExpensesTable`, `renderPnLCharts`,
  `openNewExpenseModal`/`close…`/`saveNewExpense`, `deleteExpense`.
- **Settings:** `openShopProfileModal`/`close…`/`saveShopProfile`.

## 4. Data entities in `STATE`

`shopProfile` (single) · `memberships[]` (plans) · `clients[]` (tierId → plan, wallet, visits, formula, patchTest)
· `catalog[]` (service | product; product has `stock`) · `cart[]` (itemId, name, type, price, qty, staffId)
· `staff[]` (KYC, bank, salary, serviceComm, retailComm, servicesDone, salesTotal) · `appointments[]`
(linked to client and staff **by name string**, not id) · `expenses[]` · running totals
`serviceSalesTotal`, `productSalesTotal`, `membershipSalesTotal`, `todaySales`, `todayBillsCount`.
There is no invoice entity: a completed bill exists only as receipt HTML.

## 5. Calculations — as implemented

```
subtotal   = Σ price × qty                      (all lines, services + retail + memberships)
discount   = membership: subtotal × plan.discount%      (whole cart, incl. retail)
           | promo10:    subtotal × 10%
           | festive500: min(subtotal, 500)
taxable    = max(0, subtotal − discount)
taxRate    = shopProfile.taxRate || 18
tax        = taxable × taxRate%                  (single rate, no CGST/SGST split)
grandTotal = taxable + tax + tip                 (tip untaxed)
wallet pay : client.wallet −= grandTotal         (unrounded float)
stock      : product.stock = max(0, stock − qty)
P&L service/product revenue += price × qty       (pre-discount, ex-tax)
staff.salesTotal += price × qty                  (services AND products)
commission = round(salesTotal × serviceComm)     (retailComm never used)
payroll    = Σ baseSalary + Σ commission         (salaryType ignored)
netProfit  = (services + products + memberships) − payroll − expenses
margin     = netProfit / revenue × 100
```

Executing the prototype's own logic on its seed data yields revenue ₹32,449, payroll ₹1,09,515,
expenses ₹57,800 and **net loss ₹1,34,866 (−415.6 %)**. The seed is internally inconsistent: staff
`salesTotal` sums to ₹37,500 while POS service+product sales sum to ₹28,450.

## 6. Receipt rules

Header: shop name, branch, address, phone, GSTIN, optional tagline. Meta: invoice number
`INV-` + random 6 digits, date (en-IN medium/short), client, tier, payment mode. Lines: name,
stylist first name, qty, unit price, line total. Totals: subtotal, discount (only if > 0),
GST % and amount, tip (only if > 0), net amount paid. Footer: UPI ID, thank-you, retain-receipt note.
Printed by `@media print` that hides everything except `#thermal-receipt-container` at 80 mm.

## 7. Sample records and defaults (carried into `server/prisma/seed.js` as a demo tenant)

- Shop: Aura Luxe Salon & Spa, Indiranagar Flagship, GSTIN 29AABCU9603R1ZM, 18 %, +91 80 4123 9876,
  auraluxe@okhdfcbank, #482 100ft Road … Bengaluru 560038.
- Plans: Silver Club ₹1,999/10 %/₹300 bonus/6 mo; Gold VIP ₹3,999/15 %/₹800/12 mo; Platinum Royale ₹7,999/20 %/₹2,000/12 mo.
- Services s1–s7 (₹950 – ₹4,800, 45–150 min); products p1–p3 (₹1,150/18, ₹3,150/9, ₹1,950/12).
- Staff: Vikram Mehta, Ananya Roy, Deepak Rao, Sneha Patel (salaries ₹30k/26k/22k/20k; 35/30/25/30 % service, 10 % retail).
- Clients: Pooja Sharma (Gold, ₹2,400), Rohan Mehra (Silver, ₹600), Natasha Kapoor (Platinum, ₹5,500), Rahul Verma (none).
- 3 appointments; 6 September-2026 expenses; defaults: tip 0, payment UPI, expense category Utilities,
  new employee ₹25,000 / 30 % / 10 %, restock qty 10, appointment chair "Chair 3 (Hair Station)".
- Sidebar seeds "₹28,450 / 14 bills" as hard-coded values.

## 8. Cross-module workflows

1. Appointment → *Send to POS* → selects client by **name match**, adds service by **name match**
   (fallback ₹1,200 hard-coded), assigns **staff[0]** rather than the booked stylist; appointment is never closed.
2. Membership card → *Bill this Membership* → cart line typed `service`; on checkout it is counted as
   service revenue, the client is **not enrolled** and no bonus credit is issued.
3. New client with plan → plan bonus added to wallet but **plan price never charged**.
4. Checkout → stock decrement, P&L running totals, stylist sales/commission, today's totals, visit count, receipt.
5. Catalogue *+ Bill* → add to cart and jump to POS.

## 9. Defects, simulations and security issues

| # | Issue | Severity | Fix in rebuild |
|---|-------|----------|----------------|
| D1 | No persistence; all state in memory | Critical | PostgreSQL + Prisma |
| D2 | Edit/Delete Service modals missing → buttons throw | High | Real edit + archive (no hard delete) |
| D3 | Floating-point money; wallet debited with unrounded float | High | `decimal.js` + `NUMERIC(14,2)` |
| D4 | `taxRate \|\| 18` makes 0 % GST impossible; single global rate | High | Per-item tax class, 0 % allowed |
| D5 | No CGST/SGST/IGST split, no SAC/HSN on invoice | High | Tax engine splits by place of supply |
| D6 | Random invoice numbers (collisions, gaps) | High | Per-branch sequential counter in transaction |
| D7 | Stock clamped at 0 → silent overselling | High | Conditional decrement, 409 on shortfall |
| D8 | Membership sale counted as service, client not enrolled | High | `MEMBERSHIP` line type → enrolment + bonus ledger |
| D9 | Retail commission rate never used; products earn service rate | Medium | Per-line-type commission with snapshot |
| D10 | Commission on pre-discount gross | Medium | Commission on net (post-discount, ex-tax) — documented |
| D11 | Salary frequency ignored in payroll | Medium | Payroll periods normalise Weekly/Daily |
| D12 | Wallet balance edited directly, no ledger | High | Append-only wallet ledger |
| D13 | Anyone can override prices, custom items, discounts | High | Permission checks server-side |
| D14 | Stored XSS: user input interpolated via `innerHTML` | High | React escaping; no `dangerouslySetInnerHTML` |
| D15 | Aadhaar and bank account stored/displayed in clear | High | Not collected by default; last-4 only; KYC docs behind permission |
| D16 | Appointment links by name; no conflict check; free-text time | Medium | FK links + DB exclusion constraint |
| D17 | "Print Statement" prints a blank page (print CSS hides it) | Low | Dedicated print layout |
| D18 | `setCategory`/`setPaymentMethod` use implicit global `event` | Low | React handlers |
| D19 | Revenue definitions differ (sidebar = gross incl. tax+tip; P&L = pre-discount ex-tax) | Medium | One definition (see architecture §6) |
| D20 | P&L "Current Month" label is static; no date filter | Medium | Date-range filters |
| D21 | Patch-test hard-coded "Passed"; pill shows formula as allergy note | Medium | Patch-test log entity |
| D22 | `Date.now() % N` ids collide | Medium | UUIDs |
| D23 | Membership card says "/ year" for a 6-month plan | Low | Render validity correctly |
| D24 | Expense deleted by array index without confirmation | Low | Soft-void with reason + confirm dialog |
| D25 | Restock note discarded, no cost captured | Low | Stock movement with unit cost + reference |
| D26 | Discount stays "membership" after switching to a non-member | Low | Recomputed server-side per client |
| D27 | CDN Tailwind + unpinned Chart.js | Low | Bundled, pinned deps |

## 10. Features to preserve

Every row in `03-traceability-matrix.md` — all 7 sections, all 14 modals (including the two that
were missing), split-screen POS, membership auto-discount, per-line stylist, editable price
(now permission-gated), custom charge, tip, 4 payment modes, 80 mm receipt, restock, KYC dossier
(minimised), commission ledger, expense registry with 8 categories, KPI cards, both charts, and
the income statement layout A − B − C.
