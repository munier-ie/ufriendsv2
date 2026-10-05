const fs = require('node:fs');
const path = require('node:path');

// Reuse the released function definitions without replaying schema migrations,
// opening-balance inserts, or the legacy precision migration's balance updates.
function functionSql(migration, name) {
    const sql = fs.readFileSync(path.join(__dirname, '../../prisma/migrations', migration, 'migration.sql'), 'utf8');
    const match = sql.match(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${name}\\(\\)[\\s\\S]*?END \\$\\$;`));
    if (!match) throw new Error(`Missing trigger definition: ${name}`);
    return match[0].replace(/^CREATE (?:OR REPLACE )?FUNCTION/, 'CREATE OR REPLACE FUNCTION');
}

async function installSecurityTriggers(prisma) {
    const definitions = [
        functionSql('20261005000003_reconcile_wallet_precision', 'ufriends_wallet_guard'),
        functionSql('20261004000000_wallet_security', 'ufriends_wallet_audit'),
        functionSql('20261004000000_wallet_security', 'ufriends_immutable_evidence'),
        functionSql('20261005000002_fix_account_audit_identifiers', 'ufriends_user_security_changes')
    ];
    const triggers = [
        ['wallet_guard', 'User', 'BEFORE UPDATE OF wallet, "refWallet"', 'ROW', 'ufriends_wallet_guard'],
        ['wallet_audit', 'User', 'AFTER UPDATE OF wallet, "refWallet"', 'ROW', 'ufriends_wallet_audit'],
        ['user_security_changes', 'User', 'AFTER UPDATE', 'ROW', 'ufriends_user_security_changes'],
        ['security_events_immutable', 'SecurityEvent', 'BEFORE UPDATE OR DELETE OR TRUNCATE', 'STATEMENT', 'ufriends_immutable_evidence'],
        ['security_reviews_immutable', 'SecurityReview', 'BEFORE UPDATE OR DELETE OR TRUNCATE', 'STATEMENT', 'ufriends_immutable_evidence']
    ];
    await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '10s'");
        await tx.$executeRawUnsafe('SET LOCAL search_path = public, pg_temp');
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(721403, 1)::text`;
        // Block concurrent mutations until all replacement triggers commit together.
        await tx.$executeRawUnsafe('LOCK TABLE "User", "SecurityEvent", "SecurityReview", "SecurityOutbox" IN SHARE ROW EXCLUSIVE MODE');
        // Resolve schema dependencies before changing anything. Missing columns/tables
        // must be migrated; this repair deliberately does not create or reset them.
        await tx.$queryRawUnsafe('SELECT "securityHold", wallet, "refWallet" FROM "User" LIMIT 0');
        await tx.$queryRawUnsafe('SELECT "operationId", metadata, "adminId", "oldBalance", "newBalance" FROM "SecurityEvent" LIMIT 0');
        await tx.$queryRawUnsafe('SELECT "eventId", status, attempts, "availableAt" FROM "SecurityOutbox" LIMIT 0');
        for (const sql of definitions) await tx.$executeRawUnsafe(sql);
        for (const [name, table, event, scope, fn] of triggers) {
            // Identifiers come exclusively from the fixed list above.
            await tx.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON "${table}"`);
            await tx.$executeRawUnsafe(`CREATE TRIGGER ${name} ${event} ON "${table}" FOR EACH ${scope} EXECUTE FUNCTION ${fn}()`);
        }
        await tx.$executeRawUnsafe('REVOKE UPDATE, DELETE, TRUNCATE ON "SecurityEvent", "SecurityReview" FROM PUBLIC');
        await tx.$executeRawUnsafe('REVOKE ALL ON FUNCTION ufriends_wallet_audit() FROM PUBLIC');
        await require('../../scripts/check-wallet-security').checkWalletSecurity(tx);
    }, { maxWait: 10000, timeout: 60000 });
}

module.exports = { installSecurityTriggers };
