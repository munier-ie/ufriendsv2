const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkPin() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log('No user found');
            return;
        }

        console.log('User found:', user.email);
        console.log('Legacy PIN:', user.pin);
        console.log('Transaction PIN Hash:', user.transactionPin);

        const inputPin = '1234';

        if (user.transactionPin) {
            const isMatch = await bcrypt.compare(inputPin, user.transactionPin);
            console.log(`Checking '${inputPin}' against Hash: ${isMatch}`);
        } else {
            console.log('No transaction PIN hash set.');
        }

        if (user.pin) {
            console.log(`Checking '${inputPin}' against Legacy PIN: ${user.pin === inputPin}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkPin();
