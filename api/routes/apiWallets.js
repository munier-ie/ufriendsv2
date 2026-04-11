const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const axios = require('axios');

// Load all provider handlers
const providerHandlers = {
    'alrahuz':    require('../utils/providers/alrahuz'),
    'maskawasub': require('../utils/providers/maskawasub'),
    'subandgain': require('../utils/providers/subandgain'),
    'vtpass':     require('../utils/providers/vtpass'),
    'basic':      require('../utils/providers/basic'),
    'prembly':    require('../utils/providers/prembly'),
};

/**
 * Normalize a provider's DB name into a handler lookup key.
 * e.g. "Maskawa Sub" → "maskawasub", "N3TDATA247" → "n3tdata247"
 */
function resolveHandler(providerName) {
    const key = (providerName || '').toLowerCase().replace(/\s+/g, '');
    if (providerHandlers[key]) return providerHandlers[key];
    // Partial match fallback
    for (const [k, h] of Object.entries(providerHandlers)) {
        if (key.includes(k)) return h;
    }
    return null;
}

// ============================================================
// GET /api/admin/api-wallets — List all wallets
// ============================================================
router.get('/', adminAuth, async (req, res) => {
    try {
        // Fetch all providers, auto-creating a wallet if one doesn't exist yet
        const providers = await prisma.apiProvider.findMany({
            include: { apiWallet: true }   // ← correct relation name
        });

        for (const provider of providers) {
            if (provider.apiWallet.length === 0) {
                await prisma.apiWallet.create({
                    data: { apiProviderId: provider.id, balance: 0, lowBalanceAlert: 1000 }
                });
            }
        }

        const wallets = await prisma.apiWallet.findMany({
            include: {
                apiProvider: { select: { id: true, name: true, active: true } }
            },
            orderBy: { apiProvider: { name: 'asc' } }
        });

        res.json({ success: true, wallets });
    } catch (error) {
        console.error('Fetch API wallets error:', error);
        res.status(500).json({ error: 'Failed to fetch API wallets' });
    }
});

// ============================================================
// PUT /api/admin/api-wallets/:id/update-balance — Manual update
// ============================================================
router.put('/:id/update-balance', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { balance, lowBalanceAlert } = req.body;

        const updated = await prisma.apiWallet.update({
            where: { id: parseInt(id) },
            data: {
                balance:         balance         !== undefined ? parseFloat(balance)         : undefined,
                lowBalanceAlert: lowBalanceAlert !== undefined ? parseFloat(lowBalanceAlert)  : undefined,
                lastChecked: new Date()
            },
            include: { apiProvider: { select: { name: true } } }
        });

        res.json({ success: true, message: 'Wallet updated', wallet: updated });
    } catch (error) {
        console.error('Update wallet error:', error);
        res.status(400).json({ error: 'Failed to update wallet' });
    }
});

// ============================================================
// GET /api/admin/api-wallets/check-balances
// Live-fetch each provider's balance via its API and update DB.
// Returns per-provider results so the frontend can show them.
// ============================================================
router.get('/check-balances', adminAuth, async (req, res) => {
    try {
        const wallets = await prisma.apiWallet.findMany({
            include: { apiProvider: true }
        });

        const results = [];

        for (const wallet of wallets) {
            const provider = wallet.apiProvider;
            if (!provider) {
                results.push({ provider: 'Unknown', status: 'Skipped', balance: wallet.balance, error: 'No provider record' });
                continue;
            }

            const handler = resolveHandler(provider.name);

            if (!handler || typeof handler.checkBalance !== 'function') {
                results.push({
                    provider: provider.name,
                    status: 'skipped',
                    balance: wallet.balance,
                    message: 'No live balance API integrated for this provider'
                });
                continue;
            }

            const config = {
                baseUrl:   provider.baseUrl,
                apiKey:    provider.apiKey,
                secretKey: provider.apiToken,
                username:  provider.username || ''
            };

            try {
                const balanceResult = await handler.checkBalance(config);

                if (balanceResult.success) {
                    const updated = await prisma.apiWallet.update({
                        where: { id: wallet.id },
                        data: { balance: balanceResult.balance, lastChecked: new Date() }
                    });
                    results.push({
                        provider:   provider.name,
                        status:     'updated',
                        balance:    balanceResult.balance,
                        message:    'Balance refreshed from live API'
                    });
                } else {
                    results.push({
                        provider:   provider.name,
                        status:     'failed',
                        balance:    wallet.balance,
                        message:    balanceResult.message || 'API returned an error'
                    });
                }
            } catch (providerErr) {
                results.push({
                    provider: provider.name,
                    status:   'error',
                    balance:  wallet.balance,
                    message:  providerErr.message
                });
            }
        }

        const updated = results.filter(r => r.status === 'updated').length;
        const failed  = results.filter(r => r.status === 'failed' || r.status === 'error').length;
        const skipped = results.filter(r => r.status === 'skipped').length;

        res.json({
            success: true,
            summary: { updated, failed, skipped, total: results.length },
            results
        });
    } catch (error) {
        console.error('Check balances error:', error);
        res.status(500).json({ error: 'Failed to check balances' });
    }
});

module.exports = router;
