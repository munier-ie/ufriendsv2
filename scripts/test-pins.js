const axios = require('axios');

async function testPins() {
    console.log('--- Testing PIN Services (Exam & Data Card) ---');
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

        // 2. Fetch Exam Services
        console.log('Fetching Exam services...');
        const examRes = await axios.get(`${baseUrl}/services/exam`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const exams = examRes.data.services;
        console.log(`Found ${exams.length} exam services.`);

        if (exams.length > 0) {
            const firstExam = exams[0];
            console.log(`Testing availability for: ${firstExam.name} (ID: ${firstExam.id})`);
            const availRes = await axios.get(`${baseUrl}/pins/available/${firstExam.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Availability response:', availRes.data);

            // 3. Attempt Purchase (This might fail if no balance, but we check route logic)
            console.log(`Attempting purchase for: ${firstExam.name}`);
            try {
                const purchaseRes = await axios.post(`${baseUrl}/pins/purchase`, {
                    serviceId: firstExam.id,
                    quantity: 1,
                    amount: firstExam.price,
                    pin: '1234' // Assuming 1234 is the pin for this user
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Purchase Response:', purchaseRes.data);
            } catch (pError) {
                console.log('Purchase failed (Expected if mock/no balance):', pError.response?.data || pError.message);
            }
        }

        // 4. Fetch Data Pin Services
        console.log('Fetching Data Pin services...');
        const dataPinRes = await axios.get(`${baseUrl}/services/data_pin`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const dataPins = dataPinRes.data.services;
        console.log(`Found ${dataPins.length} data pin services.`);

        if (dataPins.length > 0) {
            const firstDataPin = dataPins[0];
            console.log(`Testing availability for: ${firstDataPin.name}`);
            const availRes = await axios.get(`${baseUrl}/pins/available/${firstDataPin.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Availability response:', availRes.data);

            console.log(`Attempting purchase for: ${firstDataPin.name}`);
            try {
                const purchaseRes = await axios.post(`${baseUrl}/pins/purchase`, {
                    serviceId: firstDataPin.id,
                    quantity: 1,
                    amount: firstDataPin.price,
                    pin: '1234',
                    businessName: 'Ufriends Test'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log('Purchase Response:', purchaseRes.data);
            } catch (pError) {
                console.log('Purchase failed:', pError.response?.data || pError.message);
            }
        }

        console.log('--- PIN Testing Completed ---');

    } catch (error) {
        console.error('Test Script Error:', error.response?.data || error.message);
    }
}

testPins();
