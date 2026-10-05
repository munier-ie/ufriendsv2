CREATE OR REPLACE FUNCTION ufriends_user_security_changes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed text[] := ARRAY[]::text[]; eid text;
BEGIN
  IF OLD."firstName" IS DISTINCT FROM NEW."firstName" OR OLD."lastName" IS DISTINCT FROM NEW."lastName" THEN changed := array_append(changed, 'name'); END IF;
  IF OLD."state" IS DISTINCT FROM NEW."state" THEN changed := array_append(changed, 'state'); END IF;
  IF OLD."email" IS DISTINCT FROM NEW."email" THEN changed := array_append(changed, 'email'); END IF;
  IF OLD."phone" IS DISTINCT FROM NEW."phone" THEN changed := array_append(changed, 'phone'); END IF;
  IF OLD."password" IS DISTINCT FROM NEW."password" THEN changed := array_append(changed, 'password'); END IF;
  IF OLD."transactionPin" IS DISTINCT FROM NEW."transactionPin" OR OLD."pin" IS DISTINCT FROM NEW."pin" THEN changed := array_append(changed, 'transaction_pin'); END IF;
  IF OLD."bankNo" IS DISTINCT FROM NEW."bankNo" OR OLD."accountReference" IS DISTINCT FROM NEW."accountReference" THEN changed := array_append(changed, 'virtual_account'); END IF;
  IF OLD."bankName" IS DISTINCT FROM NEW."bankName" OR OLD."palmpayAccount" IS DISTINCT FROM NEW."palmpayAccount" OR OLD."psb9Account" IS DISTINCT FROM NEW."psb9Account" OR OLD."banklyAccount" IS DISTINCT FROM NEW."banklyAccount" OR OLD."safehavenAccount" IS DISTINCT FROM NEW."safehavenAccount" OR OLD."providusAccount" IS DISTINCT FROM NEW."providusAccount" THEN changed := array_append(changed, 'banking_details'); END IF;
  IF OLD."twoFaEnabled" IS DISTINCT FROM NEW."twoFaEnabled" OR OLD."twoFaMethod" IS DISTINCT FROM NEW."twoFaMethod" THEN changed := array_append(changed, 'two_factor'); END IF;
  IF OLD."apiKey" IS DISTINCT FROM NEW."apiKey" OR OLD."testApiKey" IS DISTINCT FROM NEW."testApiKey" THEN changed := array_append(changed, 'api_credentials'); END IF;
  IF OLD."kycStatus" IS DISTINCT FROM NEW."kycStatus" THEN changed := array_append(changed, 'kyc_status'); END IF;
  IF OLD."nin" IS DISTINCT FROM NEW."nin" OR OLD."bvn" IS DISTINCT FROM NEW."bvn" THEN changed := array_append(changed, 'identity_details'); END IF;
  IF OLD."type" IS DISTINCT FROM NEW."type" THEN changed := array_append(changed, 'account_type'); END IF;
  IF OLD."regStatus" IS DISTINCT FROM NEW."regStatus" OR OLD."securityHold" IS DISTINCT FROM NEW."securityHold" THEN changed := array_append(changed, 'account_access_status'); END IF;
  IF cardinality(changed) = 0 THEN RETURN NEW; END IF;
  eid := gen_random_uuid()::text;
  INSERT INTO "SecurityEvent" (id, kind, severity, "userId", source, metadata, "createdAt")
    VALUES (eid, 'account_security_change', 'warning', NEW."id", 'database_audit',
      jsonb_build_object('changedFields', changed), now());
  INSERT INTO "SecurityOutbox" (id, "eventId", status, attempts, "availableAt", "createdAt")
    VALUES (gen_random_uuid()::text, eid, 'pending', 0, now(), now());
  RETURN NEW;
END $$;
