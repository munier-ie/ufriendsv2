-- CreateTable: reseller_requests
-- This table was missing from the previous migration (20260506000000_add_reseller_pricing)
-- All statements use IF NOT EXISTS for safe re-application.

CREATE TABLE IF NOT EXISTS "reseller_requests" (
    "id"                  SERIAL PRIMARY KEY,
    "userId"              INTEGER,
    "contactEmail"        TEXT NOT NULL,
    "contactPhone"        TEXT NOT NULL,
    "platforms"           TEXT[],
    "hostingType"         TEXT NOT NULL,
    "extras"              TEXT[],
    "publishing"          JSONB,
    "totalAmount"         DOUBLE PRECISION NOT NULL,
    "status"              TEXT NOT NULL DEFAULT 'pending',
    "paymentRef"          TEXT,
    "paymentStatus"       TEXT DEFAULT 'unpaid',
    "adminNote"           TEXT,
    "apkUrl"              TEXT,
    "webUrl"              TEXT,
    "appStoreUrl"         TEXT,
    "playStoreUrl"        TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingData"      JSONB,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique index on paymentRef
CREATE UNIQUE INDEX IF NOT EXISTS "reseller_requests_paymentRef_key" ON "reseller_requests"("paymentRef");

-- Foreign key to User table (idempotent via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reseller_requests_userId_fkey'
    ) THEN
        ALTER TABLE "reseller_requests"
            ADD CONSTRAINT "reseller_requests_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
