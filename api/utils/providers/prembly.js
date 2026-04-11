const axios = require('axios');
const prisma = require('../../../prisma/client');

/**
 * Fetch wallet balance from Prembly API
 * Endpoint: GET https://api.prembly.com/api/v1/wallet
 * Fallbacks to VerificationSettings if the main apiProvider lacks full credentials
 */
async function checkBalance(config) {
    try {
        let apiKey = config.apiKey;
        let appId = config.secretKey || '';

        // VerificationSettings usually holds the definitive Prembly credentials
        const settings = await prisma.verificationSettings.findFirst();
        if (settings) {
            apiKey = settings.apiKey || apiKey;
            appId = settings.appId || appId;
        }

        if (!apiKey) {
            return { success: false, message: 'Prembly API Key not configured' };
        }

        const headers = { 'x-api-key': apiKey };
        if (appId) {
            headers['app-id'] = appId;
        }

        // The exact live wallet endpoint based on API docs
        const url = 'https://api.prembly.com/api/v1/wallet';

        const response = await axios.get(url, { headers });
        const result = response.data;

        if (result && result.status === true && result.data && typeof result.data.balance !== 'undefined') {
            return {
                success: true,
                balance: parseFloat(result.data.balance)
            };
        } else {
            return { 
                success: false, 
                message: result.message || 'Failed to parse Prembly balance' 
            };
        }
    } catch (error) {
        console.error('Prembly Balance Error:', error.response?.data || error.message);
        return { 
            success: false, 
            message: error.response?.data?.message || 'Connection Error or Forbidden' 
        };
    }
}

module.exports = {
    checkBalance,
};
