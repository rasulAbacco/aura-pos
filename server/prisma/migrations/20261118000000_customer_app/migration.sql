-- Customer app (Salora Glam): customer accounts signed in by mobile number + SMS code,
-- online booking requests (appointments with source APP), click-and-collect product orders,
-- and the salon's customer-app settings. Safe to re-run: every step is skipped if already in place.

-- Salon and branch settings for the customer app
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "appListed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "about" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "onlineBooking" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "onlineOrders" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "nextOrderNumber" INTEGER NOT NULL DEFAULT 1;

-- Appointments booked from the app
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'COUNTER';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "bookingGroup" UUID;
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_source_status_idx" ON "Appointment"("tenantId", "source", "status");

-- Customer accounts
CREATE TABLE IF NOT EXISTS "CustomerAccount" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "birthday" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAccount_phone_key" ON "CustomerAccount"("phone");

CREATE TABLE IF NOT EXISTS "CustomerOtp" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerOtp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CustomerOtp_phone_createdAt_idx" ON "CustomerOtp"("phone", "createdAt");

-- Product orders for pickup
CREATE TABLE IF NOT EXISTS "ShopOrder" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLACED',
    "itemsTotal" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "cancelReason" TEXT,
    "cancelledBy" TEXT,
    "invoiceId" UUID,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShopOrder_tenantId_number_key" ON "ShopOrder"("tenantId", "number");
CREATE UNIQUE INDEX IF NOT EXISTS "ShopOrder_accountId_idempotencyKey_key" ON "ShopOrder"("accountId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "ShopOrder_tenantId_branchId_status_idx" ON "ShopOrder"("tenantId", "branchId", "status");
CREATE INDEX IF NOT EXISTS "ShopOrder_accountId_createdAt_idx" ON "ShopOrder"("accountId", "createdAt");

CREATE TABLE IF NOT EXISTS "ShopOrderLine" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "ShopOrderLine_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ShopOrderLine" ADD CONSTRAINT "ShopOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Fast lookup of a salon's customer by mobile number however it was typed ("+91 98765 43210", "9876543210")
CREATE INDEX IF NOT EXISTS "Customer_phone_last10_idx" ON "Customer" (right(regexp_replace(coalesce("phone", ''), '\D', '', 'g'), 10));
