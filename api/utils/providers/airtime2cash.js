const axios = require('axios');

const BASE_URL = 'https://automation.airtimetocash.com';

/**
 * Get API Token from environment
 */
const getToken = () => process.env.AIRTIME2CASH;

/**
 * Generate OTP for Airtime to Cash
 * @param {string} networkName - MTN, GLO, etc.
 * @param {string} sender - Phone number sending the airtime
 */
async function generateOTP(networkName, sender) {
    try {
        const token = getToken();
        if (!token) throw new Error('AIRTIME2CASH token not configured');

        const response = await axios.post(`${BASE_URL}/api/v1/generate/otp`, {
            networkName,
            sender
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Airtime2Cash Generate OTP Error:', error);

        throw error;
    }
}

/**
 * Verify OTP for Airtime to Cash
 * @param {string} networkName
 * @param {string} sender
 * @param {string} otp
 */
async function verifyOTP(networkName, sender, otp) {
    try {
        const token = getToken();
        if (!token) throw new Error('AIRTIME2CASH token not configured');

        const response = await axios.post(`${BASE_URL}/api/v1/verify/otp`, {
            networkName,
            sender,
            otp
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Airtime2Cash Verify OTP Error:', error);

        throw error;
    }
}

/**
 * Transfer Airtime for Airtime to Cash
 * @param {string} networkName
 * @param {string} sender
 * @param {number} amount
 * @param {string} reference
 * @param {string} pin
 * @param {string} sessionId
 */
async function transferAirtime(networkName, sender, amount, reference, pin, sessionId) {
    try {
        const token = getToken();
        if (!token) throw new Error('AIRTIME2CASH token not configured');

        const response = await axios.post(`${BASE_URL}/api/v1/transfer/airtime`, {
            networkName,
            sender,
            amount,
            reference,
            pin,
            sessionId
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Airtime2Cash Transfer Error:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    generateOTP,
    verifyOTP,
    transferAirtime
};
