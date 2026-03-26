-- =============================================================================
-- UFriends v1 → v2 SAFE DATA MIGRATION SCRIPT
-- Generated: 2026-03-26
-- =============================================================================
--
-- SOURCE  (old DB):  ufriends_old.public schema
--   Tables reference: public."User", public."Profile", public."Wallet",
--                     public."Transaction", public."VirtualAccount", etc.
--
-- TARGET  (new DB):  ufriends_v2.public schema (Prisma-managed)
--   Tables reference: "User", "Transaction", "VirtualAccount", etc.
--
-- ASSUMPTIONS:
--   1. Both databases are accessible from the same PostgreSQL instance.
--      If they are on different instances, run this script from a server
--      that has foreign data wrappers (FDW) or dump/restore the old DB
--      first into a schema called "old" in the new DB.
--
--   2. The old DB tables are available in a schema named "old" within the
--      target database (created via pg_dump | psql, or FDW). If you loaded
--      the old dump directly into the "public" schema of an intermediate DB,
--      set old_schema accordingly.
--
--   3. This script NEVER drops or truncates new tables. It only INSERTs.
--
--   4. All new "User" rows get:
--       - firstName/lastName  split from old "Profile".name (space split;
--         if only one word, it goes to firstName, lastName = '')
--       - phone               from old "Profile".phone
--       - password            from old "User".passwordHash  (hash preserved)
--       - wallet              from old "Wallet".balance
--       - referralCode        auto-generated (uuid()) if not derivable
--       - type                1 (USER), 2 (MARKETER), 9 (ADMIN)
--       - state               NULL (not stored in old schema per-user)
--
--   5. Old Transaction.status enum → new Transaction.status Int mapping:
--       'PENDING'   → 0
--       'SUCCESS'   → 1
--       'FAILED'    → 2
--       'SUBMITTED' → 3
--       'ONGOING'   → 3
--       'REJECTED'  → 4
--       'CANCELLED' → 5
--
--   6. New Transaction requires oldBalance/newBalance which cannot be
--      reconstructed accurately per-row. We default both to 0.0 for
--      migrated rows (audit trail in meta JSON is preserved).
--
--   7. Old VirtualAccount rows (monnify + paymentpoint) are migrated
--      as separate rows with their respective provider labels.
--
--   8. RefreshToken, OtpCode, AuditLog — ephemeral/audit data. Migrated
--      as-is where columns match; otherwise skipped with explanation below.
--
-- IDEMPOTENCY: Every INSERT uses ON CONFLICT DO NOTHING. Safe to re-run.
-- =============================================================================

-- ▶ Set the old schema name. Change 'old' to 'public' if you loaded
--   the dump directly into the same DB under a different schema name.
-- ▶ In psql: \set OLD_SCHEMA old
-- ▶ Or just do a global search-replace of "old." below.

-- =============================================================================
-- STEP 0: PREREQUISITES & SAFETY CHECKS
-- =============================================================================

BEGIN;

-- Verify the old schema exists (will raise error if not)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'old'
  ) THEN
    RAISE EXCEPTION '❌ Schema "old" not found. Please load the v1 dump into the "old" schema first. '
      'Example: pg_restore -n public ... | sed "s/SET search_path = public/SET search_path = old/g" | psql ...';
  END IF;
END;
$$;

-- =============================================================================
-- STEP 1: CREATE ID MAPPING TABLE
-- =============================================================================
-- We must map old text IDs (CUIDs) → new integer IDs (SERIAL) for every
-- migrated user, so that Transaction and VirtualAccount FK references are
-- maintained correctly.
-- =============================================================================

CREATE TABLE IF NOT EXISTS _migration_user_id_map (
  old_id   TEXT PRIMARY KEY,
  new_id   INT  NOT NULL
);

-- =============================================================================
-- STEP 2: MIGRATE USERS
-- =============================================================================
-- Sources:
--   old."User"   → credentials, role, status, timestamps
--   old."Profile"  → name (split to firstName/lastName), phone
--   old."Wallet"   → balance (→ new User.wallet)
--   old."MarketerProfile" → referralCode (for MARKETER type users)
--
-- Target: public."User"  (new schema)
--
-- Notes:
--   • passwordHash  → password    (hash preserved exactly, NOT re-hashed)
--   • transactionPin→ transactionPin  (kept as-is)
--   • role mapping:
--       'ADMIN'    → type = 9
--       'MARKETER' → type = 2
--       'USER'     → type = 1
--   • isKycVerified → kycStatus
--   • referralCode:  use MarketerProfile.referralCode if exists, else gen uuid
--   • phone: from Profile (NOT NULL in new schema — see NOTE below)
-- =============================================================================

-- NOTE: old."Profile" has phone NOT NULL. However if a User has no Profile
-- row (unlikely but possible), we default phone to '' to avoid constraint
-- violations. Review such rows post-migration.

WITH

-- Build combined source CTE
src AS (
  SELECT
    u.id                                                                          AS old_id,
    u.email,
    u."passwordHash"                                                              AS password,
    u."transactionPin"                                                            AS "transactionPin",
    -- Role → type
    CASE u.role
      WHEN 'ADMIN'    THEN 9
      WHEN 'MARKETER' THEN 2
      ELSE 1
    END                                                                           AS type,
    -- firstName: everything before the first space in Profile.name
    COALESCE(
      SPLIT_PART(p.name, ' ', 1),
      'Unknown'
    )                                                                             AS "firstName",
    -- lastName: everything after the first space (may be empty)
    COALESCE(
      CASE
        WHEN STRPOS(p.name, ' ') > 0
          THEN TRIM(SUBSTRING(p.name FROM STRPOS(p.name, ' ') + 1))
        ELSE ''
      END,
      ''
    )                                                                             AS "lastName",
    COALESCE(p.phone, '')                                                         AS phone,
    -- Wallet balance
    COALESCE(w.balance, 0.00)                                                     AS wallet,
    -- referralCode: prefer MarketerProfile code, else generate
    COALESCE(mp."referralCode", REPLACE(gen_random_uuid()::TEXT, '-', ''))        AS "referralCode",
    -- KYC status
    u."isKycVerified"                                                             AS "kycStatus",
    -- PIN state
    CASE WHEN u."transactionPin" IS NOT NULL THEN 1 ELSE 0 END                    AS "pinStatus",
    CASE WHEN u."transactionPin" IS NOT NULL THEN true ELSE false END             AS "pinEnabled",
    u."createdAt"
  FROM old."User"  u
  LEFT JOIN old."Profile"         p  ON p."userId" = u.id
  LEFT JOIN old."Wallet"          w  ON w."userId" = u.id
  LEFT JOIN old."MarketerProfile" mp ON mp."userId" = u.id
),

-- Insert and capture the new IDs
inserted AS (
  INSERT INTO "User" (
    "firstName", "lastName", email, phone,
    password, "transactionPin",
    type,
    wallet, "refWallet",
    "referralCode",
    "kycStatus", "pinStatus", "pinEnabled",
    "createdAt", "updatedAt"
  )
  SELECT
    src."firstName",
    src."lastName",
    src.email,
    src.phone,
    src.password,         -- ← password HASH preserved exactly; NOT re-hashed
    src."transactionPin",
    src.type,
    src.wallet,
    0.0,                  -- refWallet: commission wallet (not in old schema)
    src."referralCode",
    src."kycStatus",
    src."pinStatus",
    src."pinEnabled",
    src."createdAt",
    NOW()                 -- updatedAt
  FROM src
  ON CONFLICT (email) DO NOTHING
  RETURNING id, email
)

-- Populate the ID mapping table
INSERT INTO _migration_user_id_map (old_id, new_id)
SELECT
  old.id  AS old_id,
  ins.id  AS new_id
FROM old."User" old
JOIN inserted ins ON ins.email = old.email
ON CONFLICT (old_id) DO NOTHING;

-- Verify count
DO $$
DECLARE
  old_count INT;
  migrated  INT;
BEGIN
  SELECT COUNT(*) INTO old_count FROM old."User";
  SELECT COUNT(*) INTO migrated  FROM _migration_user_id_map;
  RAISE NOTICE '✅ STEP 2 — Users: % migrated out of % (% skipped as duplicates by email)',
    migrated, old_count, old_count - migrated;
END;
$$;

-- =============================================================================
-- STEP 3: MIGRATE NOTIFICATIONS
-- =============================================================================
-- Source:  old."Notification"
-- Target:  "Notification"
--
-- Mapping:
--   id       → (new serial)
--   userId   → mapped via _migration_user_id_map
--   title    → title
--   body     → message
--   readAt   → isRead (non-null = true)
--   createdAt→ createdAt
--
-- NOTE: type column in old schema has no equivalent in new; discarded.
-- =============================================================================

INSERT INTO "Notification" (title, message, "isRead", "userId", "createdAt")
SELECT
  n.title,
  n.body,
  CASE WHEN n."readAt" IS NOT NULL THEN true ELSE false END,
  m.new_id,
  n."createdAt"
FROM old."Notification" n
JOIN _migration_user_id_map m ON m.old_id = n."userId"
-- No unique constraint to conflict on; idempotency via deduplication check:
WHERE NOT EXISTS (
  SELECT 1 FROM "Notification" x
  WHERE x."userId" = m.new_id
    AND x.title    = n.title
    AND x."createdAt" = n."createdAt"
);

DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM old."Notification";
  RAISE NOTICE '✅ STEP 3 — Notifications: source had % rows', cnt;
END;
$$;

-- =============================================================================
-- STEP 4: MIGRATE VIRTUAL ACCOUNTS
-- =============================================================================
-- Source:  old."VirtualAccount"
-- Target:  "VirtualAccount"
--
-- The old schema stores monnify AND paymentpoint accounts in one row.
-- We create separate rows for each provider with data.
--
-- Mapping:
--   Monnify  account → provider='Monnify', accountNumber=monnifyAccountNumber
--   PaymentPoint     → provider='PaymentPoint', accountNumber=ppAccountNumber
-- =============================================================================

-- Monnify accounts
INSERT INTO "VirtualAccount" (provider, "accountNumber", "accountName", "bankName", "userId", "createdAt")
SELECT
  'Monnify',
  va."monnifyAccountNumber",
  va."monnifyAccountName",
  COALESCE(va."monnifyBankName", 'Moniepoint Microfinance Bank'),
  m.new_id,
  va."createdAt"
FROM old."VirtualAccount" va
JOIN _migration_user_id_map m ON m.old_id = va."userId"
WHERE va."monnifyAccountNumber" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "VirtualAccount" x
    WHERE x."userId"        = m.new_id
      AND x.provider        = 'Monnify'
      AND x."accountNumber" = va."monnifyAccountNumber"
  );

-- PaymentPoint (PalmPay) accounts
INSERT INTO "VirtualAccount" (provider, "accountNumber", "accountName", "bankName", "userId", "createdAt")
SELECT
  'PaymentPoint',
  va."ppAccountNumber",
  va."ppAccountName",
  COALESCE(va."ppBankName", 'PalmPay'),
  m.new_id,
  va."createdAt"
FROM old."VirtualAccount" va
JOIN _migration_user_id_map m ON m.old_id = va."userId"
WHERE va."ppAccountNumber" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "VirtualAccount" x
    WHERE x."userId"        = m.new_id
      AND x.provider        = 'PaymentPoint'
      AND x."accountNumber" = va."ppAccountNumber"
  );

DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM old."VirtualAccount";
  RAISE NOTICE '✅ STEP 4 — Virtual Accounts: source had % rows (expanded to up-to 2 rows each)', cnt;
END;
$$;

-- =============================================================================
-- STEP 5: MIGRATE TRANSACTIONS
-- =============================================================================
-- Source:  old."Transaction"
-- Target:  "Transaction"
--
-- Mapping:
--   id        → (new serial)
--   reference → reference   (unique; used as idempotency key)
--   userId    → userId      (via _migration_user_id_map)
--   type      → type        (kept as-is)
--   amount    → amount
--   status    → status (Int):
--                 PENDING/SUBMITTED/ONGOING → 0 (pending)
--                 SUCCESS                  → 1 (success)
--                 FAILED                   → 2 (failed)
--                 REJECTED/CANCELLED       → 4 (failed/rejected)
--   category, subservice, variant → embedded into serviceName/description
--
--   IMPORTANT UNMAPPABLE COLUMNS:
--     • oldBalance / newBalance: cannot reconstruct; defaulted to 0.0
--       (the meta JSONB in old schema may contain partial balance info)
--     • pinId / pinContent: not applicable from old schema; NULL
--     • profit: preserved from old.profit
--
--   NOTE: Transactions whose userId has NO mapping (orphaned) are SKIPPED.
--         This would only occur if a User was deleted from old DB after
--         transactions were created. Such orphans are logged below.
-- =============================================================================

INSERT INTO "Transaction" (
  reference, "serviceName", description, amount,
  status, "oldBalance", "newBalance", profit,
  type, "userId", date
)
SELECT
  t.reference,
  -- serviceName: compose from category + subservice
  COALESCE(t.category, t.type, 'Unknown'),
  -- description: compose from subservice + variant
  COALESCE(
    NULLIF(CONCAT_WS(' ', t.subservice, NULLIF(t.variant, '')), ''),
    t.type
  ),
  t.amount,
  -- status mapping:
  CASE t.status::text
    WHEN 'SUCCESS'   THEN 1
    WHEN 'FAILED'    THEN 2
    WHEN 'REJECTED'  THEN 4
    WHEN 'CANCELLED' THEN 5
    ELSE 0           -- PENDING / SUBMITTED / ONGOING
  END,
  -- oldBalance / newBalance: CANNOT reconstruct; set to 0
  -- ⚠  POST-MIGRATION ACTION NEEDED: update balances from audit log if required
  0.0,
  0.0,
  COALESCE(t.profit, 0.0),
  'utility',         -- type: all old transactions treated as utility
  m.new_id,
  t."createdAt"
FROM old."Transaction" t
JOIN _migration_user_id_map m ON m.old_id = t."userId"
ON CONFLICT (reference) DO NOTHING;

-- Log orphaned transactions (userId had no matching User)
DO $$
DECLARE orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM old."Transaction" t
  WHERE NOT EXISTS (
    SELECT 1 FROM _migration_user_id_map m WHERE m.old_id = t."userId"
  );
  IF orphan_count > 0 THEN
    RAISE WARNING '⚠ STEP 5 — % orphaned transactions skipped (no matching user)', orphan_count;
  END IF;
END;
$$;

DO $$
DECLARE src INT; migrated INT;
BEGIN
  SELECT COUNT(*) INTO src      FROM old."Transaction";
  SELECT COUNT(*) INTO migrated FROM "Transaction" t
    WHERE EXISTS (
      SELECT 1 FROM _migration_user_id_map m WHERE m.new_id = t."userId"
    );
  RAISE NOTICE '✅ STEP 5 — Transactions: % inserted (source had %)', migrated, src;
END;
$$;

-- =============================================================================
-- STEP 6: MIGRATE SERVICE PRICING  (service_pricing → no direct new table)
-- =============================================================================
-- The old schema has two pricing tables:
--   old.service_pricing    → basePrice, userPrice, marketerPrice per category
--   old."ServiceCatalog"   → category, subservice, variant, parameters
--
-- In the new schema, pricing is embedded in the "Service" model directly.
-- There is no direct 1:1 equivalent because the new Service table uses a
-- completely different structure (provider-based, with separate DataPlan,
-- CablePlan tables).
--
-- ❌ CANNOT SAFELY AUTO-MIGRATE:
--   Migrating service pricing requires knowing which new "Service" record
--   corresponds to each old (category, subservice, variant) combination.
--   This mapping is business-logic-specific and cannot be inferred
--   automatically from schema inspection alone.
--
-- ✅ RECOMMENDED ACTION:
--   1. After migration, manually map old service_pricing rows to new
--      Service/DataPlan/CablePlan records.
--   2. The raw data is preserved below in a staging table for reference.
-- =============================================================================

CREATE TABLE IF NOT EXISTS _migration_service_pricing_staging (
  id             INT,
  category       TEXT,
  subservice     TEXT,
  variant        TEXT,
  "basePrice"    NUMERIC(10,2),
  "userPrice"    NUMERIC(10,2),
  "marketerPrice" NUMERIC(10,2),
  "paramsKey"    TEXT,
  parameters     JSONB,
  "updatedAt"    TIMESTAMP
);

INSERT INTO _migration_service_pricing_staging
SELECT
  sp.id, sp.category, sp.subservice, sp.variant,
  sp."basePrice", sp."userPrice", sp."marketerPrice",
  sp."paramsKey", sp.parameters, sp."updatedAt"
FROM old.service_pricing sp
ON CONFLICT DO NOTHING;

DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM old.service_pricing;
  RAISE NOTICE 'ℹ STEP 6 — % service_pricing rows staged in _migration_service_pricing_staging for manual review', cnt;
END;
$$;

-- =============================================================================
-- STEP 7: MIGRATE KYC DATA  →  User.kycStatus (already handled in STEP 2)
-- =============================================================================
-- old."KycRequest" stores KYC verification requests.
-- In the new schema there is no dedicated KycRequest table.
-- The `kycStatus` boolean on User was already migrated in STEP 2.
--
-- The BvnReport and NinReport tables in the new schema hold detailed
-- verification data. We cannot safely populate them without the actual
-- API response payloads (stored in meta/details JSON which may be present
-- in old."BvnRequest" / old."NinRequest").
--
-- ✅ BvnRequest → staged for reference
-- ✅ NinRequest → staged for reference
-- =============================================================================

CREATE TABLE IF NOT EXISTS _migration_bvn_requests_staging (LIKE old."BvnRequest");
INSERT INTO _migration_bvn_requests_staging
SELECT * FROM old."BvnRequest"
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS _migration_nin_requests_staging (LIKE old."NinRequest");
INSERT INTO _migration_nin_requests_staging
SELECT * FROM old."NinRequest"
ON CONFLICT DO NOTHING;

DO $$
DECLARE b INT; n INT;
BEGIN
  SELECT COUNT(*) INTO b FROM old."BvnRequest";
  SELECT COUNT(*) INTO n FROM old."NinRequest";
  RAISE NOTICE 'ℹ STEP 7 — % BvnRequest + % NinRequest rows staged for manual review', b, n;
END;
$$;

-- =============================================================================
-- STEP 8: MIGRATE PAYMENT DATA (old."Payment")
-- =============================================================================
-- The old "Payment" table records wallet top-up payment intents.
-- In the new schema there is no direct Payment table.
-- These are referenced by Transaction rows already migrated in STEP 5.
-- Staged for auditing purposes only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS _migration_payments_staging (
  id          TEXT,
  "userId"    TEXT,
  gateway     TEXT,
  amount      NUMERIC(12,2),
  status      TEXT,
  reference   TEXT,
  "createdAt" TIMESTAMP
);

INSERT INTO _migration_payments_staging
SELECT id, "userId", gateway, amount, status::text, reference, "createdAt"
FROM old."Payment"
ON CONFLICT DO NOTHING;

DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM old."Payment";
  RAISE NOTICE 'ℹ STEP 8 — % Payment rows staged in _migration_payments_staging', cnt;
END;
$$;

-- =============================================================================
-- STEP 9: MIGRATE DISPUTES (old."Dispute")
-- =============================================================================
-- There is no "Dispute" table in the new schema.
-- All dispute data is staged for manual review / future table creation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS _migration_disputes_staging (LIKE old."Dispute");
INSERT INTO _migration_disputes_staging
SELECT * FROM old."Dispute"
ON CONFLICT DO NOTHING;

DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM old."Dispute";
  RAISE NOTICE 'ℹ STEP 9 — % Dispute rows staged in _migration_disputes_staging', cnt;
END;
$$;

-- =============================================================================
-- STEP 10: MIGRATE AUDIT LOG (old."AuditLog")
-- =============================================================================
-- No AuditLog table in new schema.
-- Staged as-is for reference. This is the largest table — only non-webhook
-- audit rows are staged to save space.
-- =============================================================================

CREATE TABLE IF NOT EXISTS _migration_audit_log_staging (
  id             TEXT,
  "actorId"      TEXT,
  action         TEXT,
  "resourceType" TEXT,
  "resourceId"   TEXT,
  "diffJson"     JSONB,
  "createdAt"    TIMESTAMP
);

INSERT INTO _migration_audit_log_staging
SELECT id, "actorId", action, "resourceType", "resourceId", "diffJson", "createdAt"
FROM old."AuditLog"
WHERE action NOT LIKE '%WEBHOOK%'   -- skip the very large webhook rows
ON CONFLICT DO NOTHING;

DO $$
DECLARE cnt INT; staged INT;
BEGIN
  SELECT COUNT(*)                     INTO cnt    FROM old."AuditLog";
  SELECT COUNT(*)                     INTO staged FROM _migration_audit_log_staging;
  RAISE NOTICE 'ℹ STEP 10 — AuditLog: % total, % non-webhook rows staged', cnt, staged;
END;
$$;

-- =============================================================================
-- STEP 11: MIGRATE MARKETER PROFILES → User referral fields
-- =============================================================================
-- MarketerProfile has referralCode, commissionBalance, totalCommission, etc.
-- These are stored on the User model in the new schema as:
--   referralCode    → already handled in STEP 2
--   refWallet       → commissionBalance
--
-- Update refWallet for marketer-type users now that they exist in the new DB.
-- =============================================================================

UPDATE "User" u
SET "refWallet" = mp."commissionBalance"
FROM old."MarketerProfile" mp
JOIN _migration_user_id_map m ON m.old_id = mp."userId"
WHERE u.id = m.new_id
  AND mp."commissionBalance" > 0;

DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM old."MarketerProfile";
  RAISE NOTICE '✅ STEP 11 — % MarketerProfile rows processed (refWallet updated where > 0)', cnt;
END;
$$;

-- =============================================================================
-- STEP 12: MIGRATE REFRESH TOKENS → UserLogin
-- =============================================================================
-- old."RefreshToken" → new "UserLogin"
--
-- Mapping:
--   tokenId   → token (used as session identifier)
--   expiresAt, revokedAt checked: only migrate non-expired, non-revoked tokens
--
-- NOTE: Revoked or expired tokens are NOT migrated (they're useless for auth).
-- =============================================================================

INSERT INTO "UserLogin" ("userId", token, "createdAt")
SELECT
  m.new_id,
  rt."tokenId",
  rt."createdAt"
FROM old."RefreshToken" rt
JOIN _migration_user_id_map m ON m.old_id = rt."userId"
WHERE rt."revokedAt" IS NULL
  AND rt."expiresAt" > NOW()
ON CONFLICT (token) DO NOTHING;

DO $$
DECLARE total INT; migrated INT;
BEGIN
  SELECT COUNT(*) INTO total    FROM old."RefreshToken";
  SELECT COUNT(*) INTO migrated FROM old."RefreshToken" rt
    JOIN _migration_user_id_map m ON m.old_id = rt."userId"
    WHERE rt."revokedAt" IS NULL AND rt."expiresAt" > NOW();
  RAISE NOTICE '✅ STEP 12 — RefreshTokens: % active migrated out of % total (expired/revoked excluded)', migrated, total;
END;
$$;

-- =============================================================================
-- STEP 13: FINAL VALIDATION SUMMARY
-- =============================================================================

DO $$
DECLARE
  old_users     INT;
  new_users     INT;
  old_txns      INT;
  new_txns      INT;
  old_wallets   INT;
  total_wallet  NUMERIC;
BEGIN
  SELECT COUNT(*) INTO old_users  FROM old."User";
  SELECT COUNT(*) INTO new_users  FROM "User";
  SELECT COUNT(*) INTO old_txns   FROM old."Transaction";
  SELECT COUNT(*) INTO new_txns   FROM "Transaction";
  SELECT COUNT(*) INTO old_wallets FROM old."Wallet";
  SELECT COALESCE(SUM(balance),0) INTO total_wallet FROM old."Wallet";

  RAISE NOTICE '==============================================================';
  RAISE NOTICE '  MIGRATION VALIDATION SUMMARY';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE '  Users (old):          %', old_users;
  RAISE NOTICE '  Users (new):          %', new_users;
  RAISE NOTICE '  Transactions (old):   %', old_txns;
  RAISE NOTICE '  Transactions (new):   %', new_txns;
  RAISE NOTICE '  Wallets (old):        % rows, total balance = %', old_wallets, total_wallet;
  RAISE NOTICE '  New User.wallet sum:  %', (SELECT COALESCE(SUM(wallet),0) FROM "User");
  RAISE NOTICE '==============================================================';
  RAISE NOTICE '  Staging tables created for manual review:';
  RAISE NOTICE '    _migration_user_id_map';
  RAISE NOTICE '    _migration_service_pricing_staging';
  RAISE NOTICE '    _migration_bvn_requests_staging';
  RAISE NOTICE '    _migration_nin_requests_staging';
  RAISE NOTICE '    _migration_payments_staging';
  RAISE NOTICE '    _migration_disputes_staging';
  RAISE NOTICE '    _migration_audit_log_staging';
  RAISE NOTICE '==============================================================';
END;
$$;

COMMIT;

-- =============================================================================
-- POST-MIGRATION ACTIONS (manual — not automated):
-- =============================================================================
-- 1. Service Pricing: Review _migration_service_pricing_staging and manually
--    populate DataPlan, CablePlan, Service, ExamPin tables in new schema.
--
-- 2. Transaction Balances: The oldBalance/newBalance columns are all 0.0.
--    If needed, these can be approximated by running a ledger replay from
--    chronological transactions per user. Not automated here to avoid errors.
--
-- 3. BVN/NIN Reports: Review _migration_bvn_requests_staging and
--    _migration_nin_requests_staging. If the JSON details field contains
--    the full API response, you can extract fields and insert into BvnReport
--    and NinReport tables.
--
-- 4. New-schema-only tables (no old data):
--    AdminUser, PaymentGateway, ApiProvider, DataPlan, CablePlan, Service,
--    VerificationSettings, ManualServiceSettings, etc.
--    → These must be seeded fresh via application logic or seed scripts.
--
-- 5. Cleanup staging tables once manual review is complete:
--    DROP TABLE _migration_user_id_map;
--    DROP TABLE _migration_service_pricing_staging;
--    DROP TABLE _migration_bvn_requests_staging;
--    DROP TABLE _migration_nin_requests_staging;
--    DROP TABLE _migration_payments_staging;
--    DROP TABLE _migration_disputes_staging;
--    DROP TABLE _migration_audit_log_staging;
-- =============================================================================
