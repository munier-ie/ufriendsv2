const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateShortCode } = require('./api/utils/referral.utils');

async function migrate() {
    console.log('Starting referral code migration...');
    const users = await prisma.user.findMany({
        select: { id: true, referralCode: true, phone: true }
    });

    console.log(`Found ${users.length} users to update.`);

    const usedCodes = new Set();

    for (const user of users) {
        let newCode = generateShortCode();
        // Simple internal uniqueness check during migration
        while (usedCodes.has(newCode)) {
            newCode = generateShortCode();
        }
        usedCodes.add(newCode);

        await prisma.user.update({
            where: { id: user.id },
            data: { referralCode: newCode }
        });

        // Also update referredBy fields that matched the old code
        await prisma.user.updateMany({
            where: { referredBy: user.referralCode },
            data: { referredBy: newCode }
        });

        console.log(`Updated User ${user.phone}: ${user.referralCode} -> ${newCode}`);
    }

    console.log('Migration completed successfully!');
}

migrate()
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
