const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const alrahuz = require('../api/utils/providers/alrahuz');

async function run() {
    try {
        console.log("=== DIAGNOSTIC RUN ===");
        console.log("Fetching Alrahuz provider from database...");
        const provider = await prisma.apiProvider.findFirst({
            where: { name: { contains: 'alrahuz', mode: 'insensitive' } }
        });

        if (!provider) {
            console.error("Provider 'alrahuz' not found in database.");
            return;
        }

        console.log("Provider Name:", provider.name);
        console.log("Base URL:", provider.baseUrl);
        console.log("API Key Length:", provider.apiKey ? provider.apiKey.length : 0);

        const config = {
            baseUrl: provider.baseUrl,
            apiKey: provider.apiKey,
            secretKey: provider.apiToken,
            username: provider.username || ''
        };

        console.log("\n--- Step 1: Checking Balance ---");
        const balanceResult = await alrahuz.checkBalance(config);
        console.log("Balance Check Result:", balanceResult);

        console.log("\n--- Step 2: Attempting Airtime Purchase of N100 (MTN) ---");
        const details = {
            networkId: 1, // MTN
            amount: 100, // 100 Naira
            phone: '08169696095', // Test recipient
            requestId: 'diag-' + Date.now()
        };

        const purchaseResult = await alrahuz.purchaseAirtime(details, config);
        console.log("Purchase Result:", purchaseResult);

    } catch (e) {
        console.error("Diagnostic failed with error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
