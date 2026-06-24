/**
 * UFriends Node.js SDK
 * Version: 1.0.0
 * 
 * Usage:
 * const UFriends = require('./ufriends-node-sdk');
 * const client = new UFriends('your-api-key');
 * 
 * // Fetch services
 * const services = await client.getServices('data');
 * 
 * // Purchase data (sandbox mode)
 * const result = await client.purchaseService({
 *     serviceId: 1,
 *     recipient: '08012345678',
 *     amount: 500
 * }, true); // set to true for sandbox
 */

const https = require('https');
const crypto = require('crypto');

class UFriends {
    constructor(apiKey, baseUrl = 'https://ufriends.com.ng/api/v1') {
        if (!apiKey) throw new Error('API Key is required');
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replace(/\\/$/, '');
    }

    /**
     * Helper to perform HTTP requests
     */
    async _request(endpoint, method = 'GET', data = null, test = false) {
        return new Promise((resolve, reject) => {
            let urlStr = `${this.baseUrl}${endpoint}`;
            if (test) {
                urlStr += urlStr.includes('?') ? '&test=true' : '?test=true';
            }

            const url = new URL(urlStr);
            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: method.toUpperCase(),
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', chunk => responseBody += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseBody);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(parsed);
                        }
                    } catch (e) {
                        reject({ status: 1, message: 'Invalid JSON response from server', raw: responseBody });
                    }
                });
            });

            req.on('error', (err) => reject({ status: 1, message: err.message }));

            if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    /**
     * Get available services by type
     * @param {string} type 'airtime', 'data', 'cable', 'electricity', 'exam'
     */
    async getServices(type) {
        return this._request(`/services/${type}`, 'GET');
    }

    /**
     * Verify IUC or Meter number
     * @param {Object} params { type: 'cable'|'electricity', provider: 'dstv', number: '1234567890' }
     */
    async verifyService(params, test = false) {
        return this._request('/services/verify', 'POST', params, test);
    }

    /**
     * Purchase a service
     * @param {Object} params { serviceId, recipient, amount, networkType, etc. }
     * @param {boolean} test Set to true to run in Sandbox mode
     */
    async purchaseService(params, test = false) {
        return this._request('/services/purchase', 'POST', params, test);
    }

    /**
     * Verify BVN and generate slip
     * @param {Object} params { bvn: '12345678901' }
     * @param {boolean} test Set to true to run in Sandbox mode
     */
    async verifyBvn(params, test = false) {
        return this._request('/identity/bvn', 'POST', params, test);
    }

    /**
     * Verify NIN and generate slip
     * @param {Object} params { nin: '12345678901' } or { phone: '08012345678', lookupMethod: 'phone' }
     * @param {boolean} test Set to true to run in Sandbox mode
     */
    async verifyNin(params, test = false) {
        return this._request('/identity/nin', 'POST', params, test);
    }

    /**
     * Validate a webhook signature
     * @param {string} payload Raw request body string
     * @param {string} signature x-ufriends-signature header
     * @param {string} webhookSecret Your webhook secret
     */
    static verifyWebhookSignature(payload, signature, webhookSecret) {
        const hash = crypto.createHmac('sha512', webhookSecret)
                           .update(payload)
                           .digest('hex');
        return hash === signature;
    }
}

module.exports = UFriends;
