const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createDefaultAdmin() {
    try {
        console.log('Creating default admin user...');

        const password = 'Admin@123'; // Change this after first login
        const hashedPassword = await bcrypt.hash(password, 12);

        // Check if admin already exists
        const existing = await prisma.adminUser.findUnique({
            where: { username: 'admin' }
        });

        if (existing) {
            console.log('⚠️  Admin user already exists.');
            return;
        }

        const admin = await prisma.adminUser.create({
            data: {
                name: 'System Administrator',
                username: 'admin',
                password: hashedPassword,
                role: 1, // Super Admin
                pinStatus: 0, // No PIN required initially
                status: 0 // Active
            }
        });

        console.log('✅ Default admin user created successfully!');
        console.log('\nLogin Credentials:');
        console.log(`  Username: admin`);
        console.log(`  Password: ${password}`);
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createDefaultAdmin();
