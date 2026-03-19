const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const maskawa = await prisma.apiProvider.findFirst({
            where: { name: { contains: 'maskawa', mode: 'insensitive' } }
        });

        if (!maskawa) {
            console.log("Could not find maskawa API provider.");
            return;
        }

        console.log(`Found Maskawa API Provider with ID: ${maskawa.id}`);

        const result = await prisma.service.updateMany({
            where: {
                type: { in: ['cable', 'electricity'] }
            },
            data: {
                apiProviderId: maskawa.id
            }
        });

        console.log(`Updated ${result.count} Cable and Electricity services to use Maskawa Provider ID ${maskawa.id}`);
    } catch (error) {
        console.error("Error updating services:", error);
    } finally {
        await prisma.$disconnect();
    }
}

run();
