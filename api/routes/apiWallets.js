const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');
const axios = require('axios');

// GET /api/admin/api-wallets - List all wallets
router.get('/', adminAuth, async (req, res) => {
    try {
        // Fetch all providers and their wallet info
        // If a provider doesn't have a wallet entry, create one
        let providers = await prisma.apiProvider.findMany({
            include: {
                apiWallets: true
            }
        });

        // Check if any provider is missing a wallet and create it
        for (const provider of providers) {
            if (provider.apiWallets.length === 0) {
                await prisma.apiWallet.create({
                    data: {
                        apiProviderId: provider.id,
                        balance: 0,
                        lowBalanceAlert: 1000
                    }
                });
            }
        }

        // Re-fetch with wallets guaranteed
        const wallets = await prisma.apiWallet.findMany({
            include: {
                apiProvider: {
                    select: { id: true, name: true, active: true }
                }
            },
            orderBy: { apiProvider: { name: 'asc' } }
        });

        res.json({ success: true, wallets });
    } catch (error) {
        console.error('Fetch API wallets error:', error);
        res.status(500).json({ error: 'Failed to fetch API wallets' });
    }
});

// PUT /api/admin/api-wallets/:id/update-balance - Manually update balance
router.put('/:id/update-balance', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { balance, lowBalanceAlert } = req.body;

        const updated = await prisma.apiWallet.update({
            where: { id: parseInt(id) },
            data: {
                balance: balance !== undefined ? parseFloat(balance) : undefined,
                lowBalanceAlert: lowBalanceAlert !== undefined ? parseFloat(lowBalanceAlert) : undefined,
                lastChecked: new Date()
            },
            include: {
                apiProvider: { select: { name: true } }
            }
        });

        res.json({ success: true, message: 'Wallet updated', wallet: updated });
    } catch (error) {
        console.error('Update wallet error:', error);
        res.status(400).json({ error: 'Failed to update wallet' });
    }
});

// GET /api/admin/api-wallets/check-balances - Auto-check balances (Mock/Placeholder)
router.get('/check-balances', adminAuth, async (req, res) => {
    try {
        const vtpass = require('../utils/providers/vtpass');
        const basicProvider = require('../utils/providers/basic');
        const subandgain = require('../utils/providers/subandgain');
        const maskawasub = require('../utils/providers/maskawasub');

        const providers = {
            'vtpass': vtpass,
            'n3tdata': basicProvider,
            'n3tdata247': basicProvider,
            'legitdataway': basicProvider,
            'bilalsadasub': basicProvider,
            'rabdata360': basicProvider,
            'subandgain': subandgain,
            'maskawasub': maskawasub
        };

        const wallets = await prisma.apiWallet.findMany({
            include: { apiProvider: true }
        });

        const results = [];

        for (const wallet of wallets) {
            const apiProvider = wallet.apiProvider;
            const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, '');

            // Find handler
            let handler = providers[providerKey];
            if (!handler) {
                // Try partial match
                const keys = Object.keys(providers);
                for (const key of keys) {
                    if (providerKey.includes(key)) {
                        handler = providers[key];
                        break;
                    }
                }
            }

            if (handler && handler.checkBalance) {
                const config = {
                    baseUrl: apiProvider.baseUrl,
                    apiKey: apiProvider.apiKey,
                    secretKey: apiProvider.apiToken,
                    username: apiProvider.username || '',
                    userUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl : null
                };

                const balanceResult = await handler.checkBalance(config);

                if (balanceResult.success) {
                    await prisma.apiWallet.update({
                        where: { id: wallet.id },
                        data: {
                            balance: balanceResult.balance,
                            lastChecked: new Date()
                        }
                    });
                    results.push({ provider: apiProvider.name, status: 'Updated', balance: balanceResult.balance });
                } else {
                    results.push({ provider: apiProvider.name, status: `Failed: ${balanceResult.message}`, balance: wallet.balance });
                }
            } else {
                results.push({ provider: apiProvider.name, status: 'Skipped (No integration)', balance: wallet.balance });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Check balances error:', error);
        res.status(500).json({ error: 'Failed to check balances' });
    }
});

module.exports = router;
