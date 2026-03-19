const { runSmartRouting } = require('./api/services/smartRouting.service');
const prisma = require('./prisma/client');

async function dryRun() {
    console.log('--- SMART ROUTING BOT DRY RUN ---');
    try {
        await runSmartRouting();
        console.log('--- DRY RUN COMPLETE ---');
    } catch (error) {
        console.error('Dry Run Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

dryRun();
