-- AlterTable
ALTER TABLE "User" ADD COLUMN     "securityHold" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "userId" INTEGER,
    "adminId" INTEGER,
    "source" TEXT,
    "reference" TEXT,
    "operationId" TEXT,
    "oldBalance" DOUBLE PRECISION,
    "newBalance" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityReview" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityOutbox" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginChallenge" (
    "id" TEXT NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "subjectType" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "otpHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAttempt" (
    "id" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" INTEGER,
    "amount" DOUBLE PRECISION,
    "account" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecurityEvent_operationId_key" ON "SecurityEvent"("operationId");

-- CreateIndex
CREATE INDEX "SecurityEvent_kind_createdAt_idx" ON "SecurityEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_reference_idx" ON "SecurityEvent"("reference");

-- CreateIndex
CREATE INDEX "SecurityReview_eventId_createdAt_idx" ON "SecurityReview"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityOutbox_eventId_key" ON "SecurityOutbox"("eventId");

-- CreateIndex
CREATE INDEX "SecurityOutbox_status_availableAt_idx" ON "SecurityOutbox"("status", "availableAt");

-- CreateIndex
CREATE INDEX "LoginChallenge_subjectType_subjectId_purpose_idx" ON "LoginChallenge"("subjectType", "subjectId", "purpose");

-- CreateIndex
CREATE INDEX "ProviderAttempt_status_createdAt_idx" ON "ProviderAttempt"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderAttempt_transactionId_providerId_key" ON "ProviderAttempt"("transactionId", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_reference_key" ON "PaymentEvent"("provider", "reference");

-- Captures real balances even when application instrumentation is bypassed.
CREATE FUNCTION ufriends_wallet_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c jsonb; valid_context boolean;
BEGIN
  IF NEW.wallet IS NOT DISTINCT FROM OLD.wallet AND NEW."refWallet" IS NOT DISTINCT FROM OLD."refWallet" THEN RETURN NEW; END IF;
  IF NEW.wallet::text IN ('NaN','Infinity','-Infinity') OR NEW."refWallet"::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid wallet amount'; END IF;
  IF NEW.wallet < OLD.wallet OR NEW."refWallet" < OLD."refWallet" THEN
    IF OLD."securityHold" OR OLD."regStatus" <> 0 THEN RAISE EXCEPTION 'Account held or blocked'; END IF;
    IF NEW.wallet < 0 OR NEW."refWallet" < 0 THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  END IF;
  c := COALESCE(NULLIF(current_setting('ufriends.wallet_context', true), '')::jsonb, '{}'::jsonb);
  valid_context := COALESCE((c->>'userId')::int = OLD.id AND c ? 'operationId' AND c ? 'source', false);
  IF NOT valid_context AND (NEW.wallet > OLD.wallet OR NEW."refWallet" > OLD."refWallet") THEN NEW."securityHold" := true; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wallet_guard BEFORE UPDATE OF wallet, "refWallet" ON "User" FOR EACH ROW EXECUTE FUNCTION ufriends_wallet_guard();

CREATE FUNCTION ufriends_wallet_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c jsonb; m jsonb; eid text; f text; before_value double precision; after_value double precision; known boolean; kind text;
BEGIN
  c := COALESCE(NULLIF(current_setting('ufriends.wallet_context', true), '')::jsonb, '{}'::jsonb);
  FOREACH f IN ARRAY ARRAY['wallet','refWallet'] LOOP
    before_value := (to_jsonb(OLD)->>f)::double precision;
    after_value := (to_jsonb(NEW)->>f)::double precision;
    IF before_value IS NOT DISTINCT FROM after_value THEN CONTINUE; END IF;
    known := COALESCE((c->>'userId')::int = OLD.id AND c->>'field' = f AND c ? 'operationId' AND c ? 'source', false);
    eid := gen_random_uuid()::text;
    kind := CASE WHEN f = 'refWallet' THEN 'referral_change' WHEN after_value > before_value THEN 'wallet_credit' ELSE 'wallet_debit' END;
    m := CASE WHEN known THEN COALESCE(c->'metadata','{}'::jsonb) ELSE '{}'::jsonb END;
    m := m || jsonb_build_object('wallet',f,'userName',NEW."firstName" || ' ' || NEW."lastName",'userEmail',NEW.email,'userPhone',NEW.phone,'unexplained',NOT known);
    INSERT INTO "SecurityEvent" (id,kind,severity,"userId","adminId",source,reference,"operationId","oldBalance","newBalance",amount,metadata,"createdAt")
      VALUES(eid,kind,CASE WHEN known THEN 'info' ELSE 'critical' END,NEW.id,CASE WHEN known THEN (c->>'adminId')::int END,CASE WHEN known THEN c->>'source' ELSE 'unexplained' END,CASE WHEN known THEN c->>'reference' END,CASE WHEN known THEN c->>'operationId' ELSE eid END,before_value,after_value,after_value-before_value,m,now());
    IF (f = 'wallet' AND after_value > before_value) OR NOT known THEN
      INSERT INTO "SecurityOutbox"(id,"eventId",status,attempts,"availableAt","createdAt") VALUES(gen_random_uuid()::text,eid,'pending',0,now(),now());
    END IF;
  END LOOP;
  IF NEW."securityHold" AND NOT OLD."securityHold" THEN
    DELETE FROM "UserLogin" WHERE "userId" = NEW.id;
    eid := gen_random_uuid()::text;
    INSERT INTO "SecurityEvent"(id,kind,severity,"userId",source,metadata,"createdAt") VALUES(eid,'security_hold','critical',NEW.id,'database_guard','{"reason":"Unexplained wallet change; reconciliation required"}',now());
    INSERT INTO "SecurityOutbox"(id,"eventId",status,attempts,"availableAt","createdAt") VALUES(gen_random_uuid()::text,eid,'pending',0,now(),now());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wallet_audit AFTER UPDATE OF wallet, "refWallet" ON "User" FOR EACH ROW EXECUTE FUNCTION ufriends_wallet_audit();

-- Cutover snapshots are evidence of starting balances, not verified historic deposits.
INSERT INTO "SecurityEvent"(id,kind,severity,"userId",source,"oldBalance","newBalance",amount,metadata,"createdAt")
SELECT gen_random_uuid()::text,'opening_balance','info',id,'migration',wallet,wallet,0,jsonb_build_object('refWallet',"refWallet"),now() FROM "User";

CREATE FUNCTION ufriends_immutable_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Security evidence is append-only'; END $$;
CREATE TRIGGER security_events_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON "SecurityEvent" FOR EACH STATEMENT EXECUTE FUNCTION ufriends_immutable_evidence();
CREATE TRIGGER security_reviews_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON "SecurityReview" FOR EACH STATEMENT EXECUTE FUNCTION ufriends_immutable_evidence();
REVOKE UPDATE, DELETE, TRUNCATE ON "SecurityEvent", "SecurityReview" FROM PUBLIC;
REVOKE ALL ON FUNCTION ufriends_wallet_audit() FROM PUBLIC;
