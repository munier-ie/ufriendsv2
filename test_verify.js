const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

async function main() {
    const api = await prisma.apiProvider.findFirst({ where: { name: { contains: 'subandgain' } } });
    console.log("Found API:", api.name);

    // API: verify_bills.php?username=****&apiKey=****&service=****&smartNumber=****
    const url = 'https://subandgain.com/api/verify_bills.php';
    const params = {
        username: api.username,
        apiKey: api.apiKey,
        service: 'STARTIMES',
        smartNumber: '01467353636'
    };

    try {
        const response = await axios.get(url, { params });
        console.log("Direct Axios response:", response.data);
    } catch (err) {
        console.error(err.message);
    }
}
main();
