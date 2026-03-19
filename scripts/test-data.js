const axios = require('axios');

async function testDataPurchase() {
    console.log('--- Testing Data Purchase Flow ---');
    const baseUrl = 'http://localhost:3000/api';
    let token = '';

    try {
        // 1. Login
        console.log('Logging in...');
        // Find a real user first or use a known one
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            phone: '08022233344',
            password: 'password123'
        }).catch(e => {
            console.error('Login failed details:', e.response?.data || e.message);
            throw e;
        });
        token = loginRes.data.token;
        console.log('Login successful.');

        // 2. Fetch Data Services
        console.log('Fetching Data services...');
        const servicesRes = await axios.get(`${baseUrl}/services/data`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const dataServices = servicesRes.data.services;
        console.log(`Found ${dataServices.length} data services.`);

        if (dataServices.length === 0) {
            console.error('No data services found. Please seed your database.');
            return;
        }

        const testService = dataServices[0];
        console.log(`Testing with Service: ${testService.name} (ID: ${testService.id})`);

        // 3. Purchase Data
        console.log('Attempting purchase...');
        const purchaseRes = await axios.post(`${baseUrl}/services/purchase`, {
            serviceId: testService.id,
            recipient: '08123456789',
            amount: testService.price,
            pin: '1234', // Ensure this matches User.pin or User.transactionPin
            dataType: 'sme'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Purchase Response:', purchaseRes.data);

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
}

testDataPurchase();
