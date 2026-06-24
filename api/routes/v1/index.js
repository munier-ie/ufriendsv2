/**
 * /api/v1/index.js
 * External API v1 – Root Router
 *
 * Assembles all v1 sub-routers and exposes a discovery endpoint.
 *
 * Base: /api/v1
 * Auth: API Key (Authorization: Bearer <apiKey>)
 */

const express = require('express');
const router  = express.Router();

// ─── Sub-routers ─────────────────────────────────────────────────────────────
const servicesRouter  = require('./services');
const walletRouter    = require('./wallet');
const webhookRouter   = require('./webhook');
const identityRouter  = require('./identity');

router.use('/services', servicesRouter);
router.use('/wallet',   walletRouter);
router.use('/webhook',  webhookRouter);
router.use('/identity', identityRouter);

// ─── GET /api/v1 — Discovery ─────────────────────────────────────────────────
router.get('/', (req, res) => {
    res.json({
        name:    'Ufriends Developer API',
        version: '1.0.0',
        status:  'active',
        baseUrl: '/api/v1',
        access:  'Vendor accounts only. Upgrade at https://ufriends.com.ng/upgrade',
        authentication: {
            type:   'Bearer Token',
            header: 'Authorization: Bearer <YOUR_API_KEY>',
            note:   'Obtain your API key from: GET /api/auth/api-key (requires JWT login first).'
        },
        endpoints: {
            services: {
                listPlans:   'GET  /api/v1/services/:type',
                verify:      'POST /api/v1/services/verify',
                purchase:    'POST /api/v1/services/purchase'
            },
            wallet: {
                balance:           'GET  /api/v1/wallet/balance',
                transactions:      'GET  /api/v1/wallet/transactions',
                singleTransaction: 'GET  /api/v1/wallet/transactions/:reference'
            },
            identity: {
                pricing:    'GET  /api/v1/identity/pricing',
                bvnSlip:    'POST /api/v1/identity/bvn',
                ninSlip:    'POST /api/v1/identity/nin'
            },
            webhook: {
                configure:        'POST /api/v1/webhook/configure',
                getConfig:        'GET  /api/v1/webhook/config',
                test:             'POST /api/v1/webhook/test',
                regenerateSecret: 'POST /api/v1/webhook/regenerate-secret',
                logs:             'GET  /api/v1/webhook/logs'
            }
        },
        serviceTypes: ['airtime', 'data', 'cable', 'electricity', 'exam'],
        rateLimits: {
            vendor: '300 requests/min'
        },
        webhookEvents: ['transaction.success', 'transaction.failed', 'identity.bvn.success', 'identity.bvn.failed', 'identity.nin.success', 'identity.nin.failed'],
        support: 'https://ufriends.com.ng/contact'
    });
});

module.exports = router;
