const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing User.findFirst...');
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No users found.');
            process.exit(0);
        }

        console.log('Testing UserLogin model...');
        // Test deleteMany
        await prisma.userLogin.deleteMany({
            where: { userId: user.id }
        });
        console.log('deleteMany successful');

        // Test create
        const session = await prisma.userLogin.create({
            data: {
                userId: user.id,
                token: 'test-token-' + Date.now()
            }
        });
        console.log('create successful:', session.id);

        process.exit(0);
    } catch (error) {
        console.error('DIAGNOSTIC_ERROR:', error);
        process.exit(1);
    }
}

test();
