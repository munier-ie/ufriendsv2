const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    try {
        const providers = await prisma.apiProvider.findMany({
            select: { id: true, name: true }
        });
        console.log(JSON.stringify(providers, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
