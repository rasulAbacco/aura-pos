-- Customer app shop: product details and photos, salon photos, branch map position.
-- Safe to re-run: every step is skipped if already in place.

ALTER TABLE "CatalogItem" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "CatalogItem" ADD COLUMN IF NOT EXISTS "size" TEXT;
ALTER TABLE "CatalogItem" ADD COLUMN IF NOT EXISTS "mrp" DECIMAL(14,2);
ALTER TABLE "CatalogItem" ADD COLUMN IF NOT EXISTS "highlights" TEXT;
ALTER TABLE "CatalogItem" ADD COLUMN IF NOT EXISTS "howToUse" TEXT;
ALTER TABLE "CatalogItem" ADD COLUMN IF NOT EXISTS "ingredients" TEXT;
ALTER TABLE "CatalogItem" ADD COLUMN IF NOT EXISTS "showInApp" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "MediaImage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MediaImage_tenantId_ownerType_ownerId_position_idx" ON "MediaImage"("tenantId", "ownerType", "ownerId", "position");
