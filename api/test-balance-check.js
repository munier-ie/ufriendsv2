const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const maskawasub = require('./utils/providers/maskawasub');
const subandgain = require('./utils/providers/subandgain');

async function test() {
    const wallets = await prisma.apiWallet.findMany({ include: { apiProvider: true }});
    for (const w of wallets) {
        if (w.apiProvider.name.toLowerCase().includes('maskawa')) {
            const config = { baseUrl: w.apiProvider.baseUrl, apiKey: w.apiProvider.apiKey || w.apiProvider.apiToken };
            console.log('Testing Maskawa:', await maskawasub.checkBalance(config));
        }
        if (w.apiProvider.name.toLowerCase().includes('subandgain')) {
            const config = { baseUrl: w.apiProvider.baseUrl, apiKey: w.apiProvider.apiKey || w.apiProvider.apiToken, username: w.apiProvider.username };
            console.log('Testing SubandGain:', await subandgain.checkBalance(config));
        }
    }
}
test();
