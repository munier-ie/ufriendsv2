const axios = require('axios');

async function testElectricity() {
    console.log('--- Testing Electricity Service ---');
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

        // 2. Fetch Electricity Services
        console.log('Fetching Electricity services...');
        const servicesRes = await axios.get(`${baseUrl}/services/electricity`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const electricityServices = servicesRes.data.services;
        console.log(`Found ${electricityServices.length} Electricity services.`);

        if (electricityServices.length === 0) {
            console.error('No Electricity services found.');
            return;
        }

        const testService = electricityServices[0];
        console.log(`Testing with Service: ${testService.name} (ID: ${testService.id})`);

        // 3. Verify Meter
        console.log('Verifying Meter...');
        const verifyRes = await axios.post(`${baseUrl}/services/verify`, {
            type: 'electricity',
            provider: testService.provider,
            number: '1234567890',
            meterType: 'prepaid'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Verification Result:', verifyRes.data);

        // 4. Purchase Electricity
        console.log('Attempting Electricity purchase...');
        const purchaseRes = await axios.post(`${baseUrl}/services/purchase`, {
            serviceId: testService.id,
            recipient: '08022233344', // Recipient phone
            meterNumber: '1234567890',
            amount: 1000,
            pin: '1234',
            meterType: 'prepaid'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Purchase Response:', purchaseRes.data);

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    }
}

testElectricity();
