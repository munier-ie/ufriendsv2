const axios = require('axios');

async function testTermii() {
    const payload = {
        to: "2349000000000",
        from: "Ufriends",
        sms: "Test message from Ufriends via Termii API",
        type: "plain",
        channel: "generic",
        api_key: "test_key"
    };

    try {
        const response = await axios.post('https://api.ng.termii.com/api/sms/send', payload, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        console.log("SUCCESS:", response.data);
    } catch (e) {
        console.log("ERROR:", e.response?.status, e.response?.data || e.message);
    }
}

testTermii();
