const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class PaymentPointService {
    constructor() {
        this.apiKey = process.env.PAYMENTPOINT_API_KEY;
        this.apiSecret = process.env.PAYMENTPOINT_SECRET_KEY;
        this.businessId = process.env.PAYMENTPOINT_BUSINESS_ID;
        this.baseUrl = process.env.PAYMENTPOINT_BASE_URL || 'https://api.paymentpoint.co';
        this.isEnabled = process.env.PAYMENTPOINT_STATUS === 'On';
    }

    /**
     * Get PaymentPoint credentials from database or fallback to env
     * @returns {Object} - PaymentPoint config
     */
    async getCredentials() {
        try {
            const gateway = await prisma.paymentGateway.findUnique({
                where: { provider: 'PAYMENTPOINT' }
            });

            if (gateway) {
                return {
                    apiKey: gateway.apiKey || this.apiKey,
                    // PaymentPoint may use apiSecret or secretKey field depending on gateway schema structure
                    apiSecret: gateway.apiSecret || gateway.secretKey || this.apiSecret,
                    businessId: gateway.businessId || this.businessId,
                    baseUrl: this.baseUrl,
                    isEnabled: gateway.active
                };
            }
        } catch (error) {
            console.error('Error fetching PaymentPoint config from DB:', error);
        }

        return {
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
            businessId: this.businessId,
            baseUrl: this.baseUrl,
            isEnabled: this.isEnabled
        };
    }

    /**
     * Create a virtual account for a user
     * Based on PaymentPoint API documentation
     * 
     * @param {Object} userData - User data
     * @param {string} userData.email - User email
     * @param {string} userData.name - User full name
     * @param {string} userData.phoneNumber - User phone number
     * @param {Array<string>} userData.bankCodes - Array of bank codes (e.g., ['20946'])
     * @returns {Object} - Virtual account details
     */
    async createVirtualAccount(userData) {
        const creds = await this.getCredentials();

        if (!creds.isEnabled) {
            throw new Error('PaymentPoint service is not enabled');
        }

        try {
            const response = await axios.post(
                `${creds.baseUrl}/api/v1/createVirtualAccount`,
                {
                    email: userData.email,
                    name: userData.name,
                    phoneNumber: userData.phoneNumber,
                    bankCode: userData.bankCodes || ['20946'], // Default to Palmpay if not specified
                    businessId: creds.businessId
                },
                {
                    headers: {
                        'Authorization': `Bearer ${creds.apiSecret}`,
                        'Content-Type': 'application/json',
                        'api-key': creds.apiKey
                    }
                }
            );

            return {
                success: true,
                accountDetails: response.data,
                // Structure based on typical response (adjust when actual response structure is known)
                accounts: response.data.accounts || []
            };
        } catch (error) {
            console.error('PaymentPoint virtual account creation error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Failed to create virtual account with PaymentPoint');
        }
    }

    /**
     * Verify webhook signature (implementation depends on PaymentPoint's signature method)
     * @param {string} signature - Webhook signature from header
     * @param {Object} payload - Webhook payload
     * @returns {boolean} - Whether signature is valid
     */
    async verifyWebhookSignature(signature, payload) {
        const creds = await this.getCredentials();
        // Implementation depends on PaymentPoint's webhook signature method
        // Common methods: HMAC-SHA256, HMAC-SHA512
        const crypto = require('crypto');

        // Assuming HMAC-SHA256 (adjust based on actual PaymentPoint documentation)
        const hash = crypto
            .createHmac('sha256', creds.apiSecret)
            .update(JSON.stringify(payload))
            .digest('hex');

        return hash === signature;
    }

    /**
     * Get available bank codes
     * Common Nigerian bank codes for virtual accounts
     */
    getAvailableBankCodes() {
        return {
            '20946': 'Palmpay',
            '50515': 'Moniepoint MFB',
            '232': 'Sterling Bank',
            '214': 'First City Monument Bank (FCMB)',
            '058': 'Guaranty Trust Bank (GTBank)',
            '070': 'Fidelity Bank',
            // Add more based on PaymentPoint documentation
        };
    }
}

module.exports = new PaymentPointService();
