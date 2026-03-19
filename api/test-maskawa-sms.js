const axios = require('axios');

async function testEndpoint(endpoint, payload) {
    try {
        const response = await axios.post(`https://maskawasub.com/api/${endpoint}/`, payload, {
            headers: { 'Authorization': 'Token c7fe2e7e8dc6970ca5b1ceb5511e19fa9800b14d' }
        });
        console.log(`SUCCESS [${endpoint}]:`, response.data);
    } catch (e) {
        console.log(`ERROR [${endpoint}]:`, e.response?.status, e.response?.data || e.message);
    }
}

async function run() {
    const payload = {
        sender_name: "Ufriends",
        message: "Test SMS",
        routing: 2,
        contacts: "09000000000"
    };
    await testEndpoint('bulksms', payload);
    await testEndpoint('sms', payload);
}
run();
