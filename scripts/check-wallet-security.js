require('dotenv').config();
const prisma = require('../prisma/client');

async function checkWalletSecurity() {
    const triggers = await prisma.$queryRaw`
        SELECT trigger.tgname AS name, trigger.tgenabled AS enabled,
               relation.relname AS relation
        FROM pg_trigger AS trigger
        JOIN pg_class AS relation ON relation.oid = trigger.tgrelid
        JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public' AND NOT trigger.tgisinternal`;
    const required = {
        wallet_guard: 'User', wallet_audit: 'User', user_security_changes: 'User',
        security_events_immutable: 'SecurityEvent', security_reviews_immutable: 'SecurityReview'
    };
    const missing = Object.entries(required).filter(([name, relation]) => !triggers.some(trigger => trigger.name === name && trigger.relation === relation && ['O', 'A'].includes(trigger.enabled)));
    if (missing.length) throw new Error(`Missing or disabled security triggers: ${missing.map(([name]) => name).join(', ')}`);
    const [functions] = await prisma.$queryRaw`
        SELECT pg_get_functiondef('public.ufriends_wallet_guard()'::regprocedure) AS guard,
               pg_get_functiondef('public.ufriends_user_security_changes()'::regprocedure) AS account`;
    if (!functions.guard.includes('Wallet changes must use an audited wallet operation') || !functions.guard.includes("c->>'direction'")) throw new Error('Wallet enforcement migration is missing');
    if (!functions.account.includes('OLD."firstName"')) throw new Error('Account audit identifier correction is missing');
    console.log('Wallet guards, immutable audit records and account-change triggers are installed and enabled.');
}

if (require.main === module) {
    checkWalletSecurity().catch(error => {
        console.error('Wallet security deployment check failed:', error.message);
        process.exitCode = 1;
    }).finally(() => prisma.$disconnect());
}

module.exports = { checkWalletSecurity };
