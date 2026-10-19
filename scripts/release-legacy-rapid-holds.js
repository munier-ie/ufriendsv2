const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../api/.env') });

const prisma = require('../prisma/client');
const { event } = require('../api/services/security.service');

const LEGACY_REASON = 'Rapid High-Value Transactions: Multiple transactions >= ₦2,000%';

async function releaseLegacyRapidHolds() {
    // A user is eligible only when their *latest* hold is the retired rule.
    // This deliberately excludes later manual/admin holds and every other fraud signal.
    const candidates = await prisma.$queryRaw`
        SELECT user_row.id
        FROM "User" AS user_row
        JOIN LATERAL (
            SELECT id, source, metadata
            FROM "SecurityEvent"
            WHERE "userId" = user_row.id AND kind = 'security_hold'
            ORDER BY "createdAt" DESC, id DESC
            LIMIT 1
        ) AS latest_hold ON true
        WHERE user_row."securityHold" = true
          AND latest_hold.source = 'rapid_high_value_transactions'
          AND latest_hold.metadata ->> 'reason' LIKE ${LEGACY_REASON}
    `;

    let released = 0;
    for (const { id: userId } of candidates) {
        await prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
            const [latestHold] = await tx.$queryRaw`
                SELECT source, metadata
                FROM "SecurityEvent"
                WHERE "userId" = ${userId} AND kind = 'security_hold'
                ORDER BY "createdAt" DESC, id DESC
                LIMIT 1
            `;
            const isLegacyHold = latestHold?.source === 'rapid_high_value_transactions'
                && typeof latestHold.metadata?.reason === 'string'
                && latestHold.metadata.reason.startsWith('Rapid High-Value Transactions: Multiple transactions >= ₦2,000');
            const user = await tx.user.findUnique({ where: { id: userId }, select: { securityHold: true } });
            if (!user?.securityHold || !isLegacyHold) return;

            await tx.user.update({ where: { id: userId }, data: { securityHold: false } });
            await event(tx, {
                kind: 'security_unhold',
                severity: 'info',
                userId,
                source: 'security_policy_repair',
                metadata: {
                    reason: 'Released by the 2026-10-19 rapid high-value transaction policy repair.',
                    retiredRule: 'rapid_high_value_transactions_second_2000_purchase'
                }
            }, true);
            released += 1;
        });
    }

    console.log(`Legacy rapid-high-value security holds released: ${released}`);
}

releaseLegacyRapidHolds()
    .catch(error => {
        console.error('Legacy rapid-high-value hold repair failed:', error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
