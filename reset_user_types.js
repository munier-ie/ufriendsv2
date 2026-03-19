const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetUserTypes() {
    try {
        console.log('Resetting all user types to default (type: 1 - Regular User)...');

        // Update all users to type 1 (Regular User)
        const result = await prisma.user.updateMany({
            data: {
                type: 1
            }
        });

        console.log(`✅ Successfully reset ${result.count} users to type 1 (Regular User)`);
        console.log('\nUser type meanings:');
        console.log('  1 = Regular User (default)');
        console.log('  2 = Agent (upgrade tier)');
        console.log('  3 = Vendor (premium upgrade tier)');
        console.log('\nNote: Admin access is now separate in the AdminUser table.');

    } catch (error) {
        console.error('❌ Error resetting user types:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetUserTypes();
