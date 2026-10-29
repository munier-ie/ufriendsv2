ALTER TABLE "airtime_to_cash_rates"
  ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT NOT NULL DEFAULT '';

INSERT INTO "airtime_to_cash_rates" ("network", "rate", "active", "phoneNumber", "updatedAt")
VALUES
  ('MTN', 85, true, '', CURRENT_TIMESTAMP),
  ('GLO', 75, true, '', CURRENT_TIMESTAMP),
  ('AIRTEL', 80, true, '', CURRENT_TIMESTAMP),
  ('9MOBILE', 80, true, '', CURRENT_TIMESTAMP)
ON CONFLICT ("network") DO NOTHING;
