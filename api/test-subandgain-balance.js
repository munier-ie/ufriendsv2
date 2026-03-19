const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const w = await prisma.apiWallet.findFirst({ 
        where: { apiProvider: { name: { contains: 'subandgain' } } }, 
        include: { apiProvider: true }
    });
    if (!w) return console.log('No subandgain wallet');
    
    console.log('Provider Found:', w.apiProvider.name);
    
    const { username } = w.apiProvider;
    const finalKey = w.apiProvider.apiKey || w.apiProvider.apiToken;
    const url = 'https://subandgain.com/api/balance.php';
    const params = { username, apiKey: finalKey };
    
    try {
        console.log('Sending Params:', params);
        const response = await axios.get(url, { params });
        console.log('Raw Response:', response.data);
    } catch (e) {
        console.log('Error:', e.response?.data || e.message);
    }
}
test();
