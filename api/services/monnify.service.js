const axios = require('axios');

class MonnifyService {
    constructor() {
        this.apiKey = process.env.MONNIFY_API_KEY;
        this.secretKey = process.env.MONNIFY_SECRET_KEY;
        this.contractCode = process.env.MONNIFY_CONTRACT_CODE;
        this.baseUrl = process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com';
        this.isEnabled = process.env.MONNIFY_STATUS === 'On';
    }

    /**
     * Get authentication token from Monnify
     */
    async getAuthToken() {
        try {
            const credentials = Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64');

            const response = await axios.post(
                `${this.baseUrl}/api/v1/auth/login`,
                {},
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.responseBody.accessToken;
        } catch (error) {
            console.error('Monnify auth error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Monnify');
        }
    }

    /**
     * Create a virtual account for a user
     * @param {Object} userData - User data
     * @param {number} userData.userId - User ID
     * @param {string} userData.firstName - User first name
     * @param {string} userData.lastName - User last name
     * @param {string} userData.email - User email
     * @param {string} userData.phone - User phone
     * @param {string} userData.bvn - User BVN (encrypted in DB, decrypted for API)
     * @param {string} userData.nin - User NIN (optional)
     * @returns {Object} - Virtual account details
     */
    async createVirtualAccount(userData) {
        if (!this.isEnabled) {
            throw new Error('Monnify service is not enabled');
        }

        try {
            const token = await this.getAuthToken();
            const accountReference = `UFRIENDS_${userData.phone}_${userData.userId}`;

            const payload = {
                accountReference,
                accountName: `${userData.firstName} ${userData.lastName}`.toUpperCase(),
                currencyCode: 'NGN',
                contractCode: this.contractCode,
                customerEmail: userData.email,
                customerName: `${userData.firstName} ${userData.lastName}`,
                bvn: userData.bvn, // Required for account creation
                nin: userData.nin || undefined,
                getAllAvailableBanks: true, // Get all bank options (Wema, Monie Point, Sterling, etc.)
                preferredBanks: ['035', '50515', '232'] // Wema, Monie Point, Sterling
            };

            const response = await axios.post(
                `${this.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.requestSuccessful) {
                return {
                    success: true,
                    accountReference,
                    accounts: response.data.responseBody.accounts.map(acc => ({
                        bankName: acc.bankName,
                        bankCode: acc.bankCode,
                        accountNumber: acc.accountNumber,
                        accountName: acc.accountName
                    })),
                    primaryAccount: response.data.responseBody.accounts[0]
                };
            } else {
                throw new Error(response.data.responseMessage || 'Failed to create virtual account');
            }
        } catch (error) {
            console.error('Monnify virtual account creation error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.responseMessage || 'Failed to create virtual account');
        }
    }

    /**
     * Update BVN on existing Monnify account
     * @param {string} accountReference - Account reference
     * @param {string} bvn - BVN to update
     */
    async updateBVN(accountReference, bvn) {
        if (!this.isEnabled) {
            throw new Error('Monnify service is not enabled');
        }

        try {
            const token = await this.getAuthToken();

            const response = await axios.put(
                `${this.baseUrl}/api/v1/bank-transfer/reserved-accounts/update-customer-bvn`,
                {
                    accountReference,
                    bvn
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.requestSuccessful;
        } catch (error) {
            console.error('Monnify BVN update error:', error.response?.data || error.message);
            throw new Error('Failed to update BVN on Monnify');
        }
    }

    /**
     * Verify webhook signature
     * @param {string} signature - Webhook signature from header
     * @param {Object} payload - Webhook payload
     * @returns {boolean} - Whether signature is valid
     */
    verifyWebhookSignature(signature, payload) {
        const crypto = require('crypto');
        const hash = crypto
            .createHmac('sha512', this.secretKey)
            .update(JSON.stringify(payload))
            .digest('hex');

        return hash === signature;
    }
}

module.exports = new MonnifyService();
