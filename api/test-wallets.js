const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const wallets = await prisma.apiWallet.findMany({ include: { apiProvider: true }});
    wallets.forEach(w => {
        console.log(`Wallet found for: ${w.apiProvider.name} (Balance: ${w.balance})`);
    });
    
    // Check if maskawasub exists in ApiProvider but missing Wallet
    const maskawa = await prisma.apiProvider.findFirst({ where: { name: { contains: 'Maskawa' } }, include: { apiWallets: true } });
    if (maskawa) {
        console.log('\nMaskawa found in Providers. Has wallets?', maskawa.apiWallets.length > 0);
    }
}
test();
