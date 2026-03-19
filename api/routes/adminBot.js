const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { runSmartRouting } = require('../services/smartRouting.service');
const prisma = require('../../prisma/client');

/**
 * GET /api/admin/bot/stats
 * Get summary of the last bot run and general stats
 */
router.get('/stats', adminAuth, async (req, res) => {
    try {
        // We can find the last updated plan or routing rule to get a rough idea of last activity
        const lastSyncPlan = await prisma.dataPlan.findFirst({
            orderBy: { updatedAt: 'desc' }
        });

        const lastSyncRouting = await prisma.providerRouting.findFirst({
            orderBy: { updatedAt: 'desc' }
        });

        const discoveryCount = await prisma.dataPlan.count({
            where: {
                active: false,
                apiProviderId: { not: null }
            }
        });

        res.json({
            success: true,
            stats: {
                lastSync: lastSyncRouting?.updatedAt || lastSyncPlan?.updatedAt || null,
                pendingDiscoveries: discoveryCount,
                status: 'online'
            }
        });
    } catch (error) {
        console.error('Bot stats error:', error);
        res.status(500).json({ error: 'Failed to fetch bot stats' });
    }
});

/**
 * POST /api/admin/bot/sync
 * Manually trigger the smart routing bot
 */
router.post('/sync', adminAuth, async (req, res) => {
    try {
        console.log(`[Admin] Manual Smart Routing Sync triggered by ${req.admin.username}`);

        // Run the service logic
        await runSmartRouting();

        res.json({
            success: true,
            message: 'Smart Routing Bot completed successfully. Prices and routing updated.'
        });
    } catch (error) {
        console.error('Manual Bot Sync failed:', error);
        res.status(500).json({ error: 'Bot sync failed during execution' });
    }
});

module.exports = router;
