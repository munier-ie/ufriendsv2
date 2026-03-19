const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAirtimeCash() {
    console.log('--- Testing Airtime to Cash Flow ---');

    try {
        // 1. Setup - Find a test user
        const user = await prisma.user.findFirst({
            where: { email: 'recipient@example.com' }
        });

        if (!user) {
            console.error('Test user not found');
            return;
        }

        console.log(`User: ${user.email}, Initial Wallet: ${user.wallet}`);

        // 2. Setup - Ensure Rates exist
        await prisma.airtimeToCashRate.upsert({
            where: { network: 'MTN' },
            update: { rate: 85, active: true },
            create: { network: 'MTN', rate: 85, active: true }
        });

        // 3. Submit Request
        const amount = 1000;
        const rate = 85;
        const convertedAmount = amount * (rate / 100);

        const request = await prisma.airtimeToCashRequest.create({
            data: {
                userId: user.id,
                network: 'MTN',
                amount: amount,
                rate: rate,
                convertedAmount: convertedAmount,
                phoneNumber: '08130000000',
                status: 0
            }
        });

        console.log(`Submitted Request ID: ${request.id}, Converted Amount: ${convertedAmount}`);

        // 4. Approve Request (Simulate admin logic)
        let admin = await prisma.admin.findFirst();
        if (!admin) {
            // Create a dummy admin if none exists
            admin = await prisma.admin.create({
                data: {
                    name: 'Test Admin',
                    username: 'testadmin',
                    email: 'testadmin@example.com',
                    password: 'hashed_password',
                    role: 'ADMIN'
                }
            });
        }

        await prisma.$transaction(async (tx) => {
            // Update request
            await tx.airtimeToCashRequest.update({
                where: { id: request.id },
                data: {
                    status: 1,
                    adminId: admin.id,
                    processedAt: new Date()
                }
            });

            // Credit User
            await tx.user.update({
                where: { id: user.id },
                data: { wallet: { increment: convertedAmount } }
            });

            // Transaction log
            await tx.transaction.create({
                data: {
                    reference: `TEST-ATC-${request.id}`,
                    userId: user.id,
                    amount: convertedAmount,
                    type: 'utility',
                    serviceName: 'Airtime to Cash',
                    status: 0,
                    description: `Airtime conversion: MTN ${amount} (Rate: ${rate}%)`,
                    oldBalance: user.wallet,
                    newBalance: user.wallet + convertedAmount
                }
            });
        });

        console.log('Request Approved successfully');

        // 5. Verify Balance
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
        console.log(`Updated Wallet: ${updatedUser.wallet}, Expected: ${user.wallet + convertedAmount}`);

        if (updatedUser.wallet === user.wallet + convertedAmount) {
            console.log('✅ Balance Verification Passed');
        } else {
            console.log('❌ Balance Verification Failed');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAirtimeCash();
