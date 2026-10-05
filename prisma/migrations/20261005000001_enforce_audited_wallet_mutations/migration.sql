-- Roll forward databases that already applied the initial wallet security migration.
CREATE OR REPLACE FUNCTION ufriends_wallet_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c jsonb; valid_context boolean;
BEGIN
  IF NEW.wallet IS NOT DISTINCT FROM OLD.wallet AND NEW."refWallet" IS NOT DISTINCT FROM OLD."refWallet" THEN RETURN NEW; END IF;
  IF NEW.wallet::text IN ('NaN','Infinity','-Infinity') OR NEW."refWallet"::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid wallet amount'; END IF;
  IF NEW.wallet < OLD.wallet OR NEW."refWallet" < OLD."refWallet" THEN
    IF OLD."securityHold" OR OLD."regStatus" <> 0 THEN RAISE EXCEPTION 'Account held or blocked'; END IF;
    IF NEW.wallet < 0 OR NEW."refWallet" < 0 THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  END IF;
  c := COALESCE(NULLIF(current_setting('ufriends.wallet_context', true), '')::jsonb, '{}'::jsonb);
  valid_context := COALESCE(
    (c->>'userId')::int = OLD.id AND c ? 'operationId' AND NULLIF(c->>'operationId','') IS NOT NULL AND NULLIF(c->>'source','') IS NOT NULL
    AND c->>'direction' IN ('credit','debit') AND c->>'field' IN ('wallet','refWallet')
    AND CASE c->>'field'
      WHEN 'wallet' THEN NEW."refWallet" IS NOT DISTINCT FROM OLD."refWallet"
        AND ((c->>'direction' = 'credit' AND NEW.wallet > OLD.wallet) OR (c->>'direction' = 'debit' AND NEW.wallet < OLD.wallet))
        AND abs((NEW.wallet - OLD.wallet) - ((c->>'amount')::double precision * CASE WHEN c->>'direction' = 'credit' THEN 1 ELSE -1 END)) < 0.000001
      WHEN 'refWallet' THEN NEW.wallet IS NOT DISTINCT FROM OLD.wallet
        AND ((c->>'direction' = 'credit' AND NEW."refWallet" > OLD."refWallet") OR (c->>'direction' = 'debit' AND NEW."refWallet" < OLD."refWallet"))
        AND abs((NEW."refWallet" - OLD."refWallet") - ((c->>'amount')::double precision * CASE WHEN c->>'direction' = 'credit' THEN 1 ELSE -1 END)) < 0.000001
      ELSE false END, false);
  IF NOT valid_context THEN RAISE EXCEPTION 'Wallet changes must use an audited wallet operation'; END IF;
  RETURN NEW;
END $$;
