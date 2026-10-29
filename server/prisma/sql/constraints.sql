-- Data-integrity guards that Prisma's schema language cannot express.
-- These are the last line of defence; services also validate before writing.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- No double-booking: one active appointment per staff member per time slot.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staff_no_overlap"
  EXCLUDE USING gist ("staffId" WITH =, tsrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" NOT IN ('CANCELLED', 'NO_SHOW'));

-- No double-booking of an exclusive chair/room.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_resource_no_overlap"
  EXCLUDE USING gist ("resourceId" WITH =, tsrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("resourceId" IS NOT NULL AND "status" NOT IN ('CANCELLED', 'NO_SHOW'));

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_time_order" CHECK ("endsAt" > "startsAt");

-- Stock can never go negative (overselling is rejected, not clamped).
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_quantity_nonneg" CHECK ("quantity" >= 0);

-- Wallet can never be overspent.
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_wallet_nonneg" CHECK ("walletBalance" >= 0);

ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_quantity_pos" CHECK ("quantity" > 0);
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_refund_qty" CHECK ("refundedQuantity" >= 0 AND "refundedQuantity" <= "quantity");
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_price_nonneg" CHECK ("price" >= 0);
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_tax_range" CHECK ("taxRate" >= 0 AND "taxRate" <= 100);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_pos" CHECK ("amount" > 0);
