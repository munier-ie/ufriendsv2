const axios = require('axios');

async function testTV() {
    console.log('--- Testing TV Service ---');
    const baseUrl = 'http://localhost:3000/api';
    let token = '';

    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, {
            phone: '08022233344',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('Login successful.');

        // 2. Fetch TV Services
        console.log('Fetching TV services...');
        const servicesRes = await axios.get(`${baseUrl}/services/cable`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const tvServices = servicesRes.data.services;
        console.log(`Found ${tvServices.length} TV services.`);

        if (tvServices.length === 0) {
            console.error('No TV services found.');
            return;
        }

        const testService = tvServices[0];
        console.log(`Testing with Service: ${testService.name} (ID: ${testService.id})`);

        // 3. Verify IUC
        console.log('Verifying IUC...');
        const verifyRes = await axios.post(`${baseUrl}/services/verify`, {
            type: 'cable',
            provider: testService.provider,
            number: '1234567890'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Verification Result:', verifyRes.data);

        // 4. Purchase TV
        console.log('Attempting TV purchase...');
        const purchaseRes = await axios.post(`${baseUrl}/services/purchase`, {
            serviceId: testService.id,
            recipient: '08022233344', // Recipient phone
            iucNumber: '1234567890',
            amount: testService.price,
            pin: '1234',
            subscriptionType: 'change'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Purchase Response:', purchaseRes.data);

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
}

testTV();
