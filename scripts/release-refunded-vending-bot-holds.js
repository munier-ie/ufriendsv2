const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../api/.env') });

const prisma = require('../prisma/client');
const { event } = require('../api/services/security.service');

async function releaseRefundedVendingBotHolds() {
    const candidates = await prisma.$queryRaw`
        SELECT user_row.id
        FROM "User" AS user_row
        JOIN LATERAL (
            SELECT source
            FROM "SecurityEvent"
            WHERE "userId" = user_row.id AND kind = 'security_hold'
            ORDER BY "createdAt" DESC, id DESC
            LIMIT 1
        ) AS latest_hold ON true
        WHERE user_row."securityHold" = true AND latest_hold.source = 'vending_bot_rule'
    `;

    let released = 0;
    for (const { id: userId } of candidates) {
        await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
            const latestHold = await tx.securityEvent.findFirst({
                where: { userId, kind: 'security_hold' },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                select: { source: true, createdAt: true }
            });
            if (latestHold?.source !== 'vending_bot_rule') return;

            const debits = await tx.securityEvent.findMany({
                where: {
                    userId,
                    kind: 'wallet_debit',
                    operationId: { not: null },
                    amount: { lt: 0 },
                    source: { not: 'admin_debit' },
                    createdAt: { gte: new Date(latestHold.createdAt.getTime() - 5 * 60 * 1000), lte: latestHold.createdAt }
                },
                select: { reference: true }
            });
            const references = [...new Set(debits.map(debit => debit.reference).filter(Boolean))];
            if (debits.length < 5 || references.length !== debits.length) return;
            const transactions = await tx.transaction.findMany({ where: { reference: { in: references } }, select: { reference: true, status: true } });
            if (transactions.length !== references.length || transactions.some(transaction => transaction.status !== 3)) return;

            const user = await tx.user.findUnique({ where: { id: userId }, select: { securityHold: true } });
            if (!user?.securityHold) return;
            await tx.user.update({ where: { id: userId }, data: { securityHold: false } });
            await event(tx, {
                kind: 'security_unhold', severity: 'info', userId, source: 'security_policy_repair',
                metadata: { reason: 'Released because every purchase that triggered the vending velocity hold was refunded.', retiredRule: 'refunded_vends_counted_as_bot_velocity' }
            }, true);
            released += 1;
        });
    }
    console.log(`Refunded-vending bot security holds released: ${released}`);
}

releaseRefundedVendingBotHolds()
    .catch(error => { console.error('Refunded-vending hold repair failed:', error); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
