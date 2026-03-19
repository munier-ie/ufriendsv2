const axios = require('axios');

async function testEP(ep) {
    try {
        const res = await axios.post(`https://maskawasub.com/api/${ep}/`, {
            sender_name: "Ufriends", message: "Test", routing: 2, contacts: "09000000000"
        }, { headers: { 'Authorization': 'Token c7fe2e7e8dc6970ca5b1ceb5511e19fa9800b14d' }});
        console.log(`[${ep}] SUCCESS:`, res.data);
    } catch (e) {
        console.log(`[${ep}] ERROR:`, e.response?.status, e.response?.data || e.message);
    }
}

async function run() {
    const endpoints = ['sendsms', 'sms_send', 'bulk_message', 'message', 'bulksms', 'send_sms', 'sms'];
    for (const ep of endpoints) await testEP(ep);
}
run();
