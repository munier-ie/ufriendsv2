# Wallet security and rollout

## Before enabling production traffic

1. Back up the production database and test the release against a restored copy.
2. Set `ADMIN_EMAIL` and working SMTP credentials. The notification worker starts with the API and retries failed delivery.
3. Run `npm run build:backend` using the deployment database credentials. It generates Prisma, applies migrations, and checks the installed security triggers. `prisma db push` alone does **not** install these triggers.
4. Restart every API process with the new code, then check a legitimate payment, purchase, refund, and admin alert in staging before reopening production traffic.

The historical migration directory starts with changes to an existing database; it is not a complete bootstrap for an empty database. If the production database was created with `db push` and has no migration history, reconcile that history against a restored copy first. Do not reset production or mark unapplied security migrations as applied to bypass a migration error.

`npm run check:wallet-security` is a read-only deployment check. It verifies that the wallet guard, wallet audit, account-change audit and immutable evidence triggers are enabled, including the corrected account field names. Use a restricted application database role; these controls do not protect against a database owner deliberately disabling them.

## Wallet and purchase behavior

- Every application wallet mutation goes through the shared wallet service. PostgreSQL rejects changes without matching operation context, and the application rejects operations that produced no audit record.
- Credits, their audit/outbox records, and funding holds commit together. Failure to evaluate fraud rules aborts the credit.
- Spending checks run with the account row locked, across web purchases, API purchases, bulk jobs, identity services, orders and transfers. A rejected purchase rolls back; its security hold is then recorded separately so it survives that rollback.
- High-value purchase detection counts negative audited debits, excluding credits and admin deductions. Concurrent requests cannot independently pass using the same old balance or spending history.
- Vending requires matching debit evidence and an unrefunded transaction. Provider attempts are recorded before dispatch. Repeated submissions cannot invoke another provider while delivery is pending or already successful.
- Recharge-card orders also deduct before provider dispatch. Fractional card quantities are rejected. The unused direct `/api/bvn/verify` and `/api/nin/verify` routes now return HTTP 410; clients must use the existing paid professional/API request flow.
- Provider timeouts, connection errors and unclear results remain pending, with an admin alert. They do not automatically refund or trigger fallback delivery. A confirmed rejection allows a refund; a confirmed success does not.
- Refunds retain the original debit amount and track cumulative refunds. Repeated or concurrent refunds cannot exceed the original debit. Identity and manual-service refund paths use this same accounting.

## Current detection rules

| Activity | Response |
| --- | --- |
| Wallet credit of at least ₦10,000 | Hold account and notify admin |
| Wallet credit of at least ₦5,000 but below ₦10,000 | Notify admin |
| Credits exceed the account's daily limit (default ₦50,000) | Hold account and notify admin |
| Account younger than 24 hours receives at least ₦10,000 | Hold account and notify admin |
| Three credits within ten minutes | Hold account and notify admin |
| Another purchase of at least ₦2,000 within five minutes | Reject purchase, hold account and notify admin |
| Five existing deductions within five minutes followed by another | Reject purchase, hold account and notify admin |
| Authenticated negative amount/quantity or forged negative recipient count | Reject request, hold account and notify admin |

These are conservative rules and can flag legitimate customers. A hold blocks spending and authenticated use and revokes user sessions; it does not confiscate the balance. An authorized admin reviews and releases the hold. Credit notifications include refunds and transfers, so those can also contribute to thresholds.

## Admin review

Use **Security Events** for alerts and **System Transactions** for the financial record.

For an uncertain provider response, use **Resolve Provider Outcome** after checking the provider portal or support. Record the confirmed outcome, provider reference/support ticket and a clear reason. Confirmed failure issues one audited refund; confirmed delivery marks the transaction successful. Every decision records the admin and queues a notification.

**Audited Legacy Refund** is limited to transactions dated before that user's recorded audit opening balance and lacking audited debit evidence. It requires an explicit reason and records that the historical debit is unverified. Check older statements and previous refunds manually before approving; missing historical evidence cannot be reconstructed by this feature.

## Proxy configuration

Leave `TRUSTED_PROXY_ADDRESSES` empty when Node receives requests directly. Use `loopback` only when a trusted proxy on the same VPS connects over localhost. Otherwise configure the actual proxy addresses seen by Node, with forwarded headers correctly controlled by that proxy. The Azure VPS public IP is not automatically the correct value.

## Verification

Run `npm run test:security`. It requires local PostgreSQL tools (`initdb`, `pg_ctl`, `createdb`, `psql`) and installed Node dependencies. Run as a non-root user. The script creates a temporary local cluster, bootstraps the current schema, installs the actual security trigger SQL, runs the integration checks, and stops the cluster. It never selects the production database from `.env`.

Coverage includes database guard enforcement, missing audit handling, concurrent deductions and credits, credit/spend query failures, configured fraud thresholds, login/API holds, refund limits, legacy evidence, provider duplicate dispatch and uncertain outcomes, authenticated admin reconciliation, both payment webhook signatures/replay protection, concurrent admin approvals/rejections, and notification retry. External provider delivery and real SMTP are not exercised by these local tests.
