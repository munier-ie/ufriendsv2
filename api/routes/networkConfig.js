const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema for updating network config
const updateSchema = z.object({
    active: z.boolean().optional(),
    smeDataEnabled: z.boolean().optional(),
    giftingEnabled: z.boolean().optional(),
    corporateEnabled: z.boolean().optional(),
    couponEnabled: z.boolean().optional(),
    vtuEnabled: z.boolean().optional(),
    shareSellEnabled: z.boolean().optional()
});

// GET /api/admin/config/networks - List all network configurations
router.get('/', adminAuth, async (req, res) => {
    try {
        let networks = await prisma.networkConfiguration.findMany({
            orderBy: { id: 'asc' }
        });

        // If no networks found, seed them automatically
        if (networks.length === 0) {
            const defaultNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
            for (const name of defaultNetworks) {
                await prisma.networkConfiguration.create({
                    data: { network: name, updatedAt: new Date() }
                });
            }
            networks = await prisma.networkConfiguration.findMany({
                orderBy: { id: 'asc' }
            });
        }

        res.json({ success: true, networks });
    } catch (error) {
        console.error('Fetch networks error:', error);
        res.status(500).json({ error: 'Failed to fetch network configurations' });
    }
});

// PUT /api/admin/config/networks/:network - Update specific network config
router.put('/:network', adminAuth, async (req, res) => {
    try {
        const { network } = req.params;
        const data = updateSchema.parse(req.body);

        // Find network first
        const existing = await prisma.networkConfiguration.findUnique({
            where: { network: network.toUpperCase() }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Network not found' });
        }

        const updated = await prisma.networkConfiguration.update({
            where: { network: network.toUpperCase() },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: `${network} updated successfully`, network: updated });
    } catch (error) {
        console.error('Update network error:', error);
        res.status(400).json({ error: error.message || 'Failed to update network' });
    }
});

// POST /api/admin/config/networks/seed - Force re-seed (dev utility)
router.post('/seed', adminAuth, async (req, res) => {
    try {
        const defaultNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
        const results = [];

        for (const name of defaultNetworks) {
            const upserted = await prisma.networkConfiguration.upsert({
                where: { network: name },
                update: { updatedAt: new Date() },
                create: { network: name, updatedAt: new Date() }
            });
            results.push(upserted);
        }

        res.json({ success: true, message: 'Networks seeded successfully', networks: results });
    } catch (error) {
        res.status(500).json({ error: 'Failed to seed networks' });
    }
});

module.exports = router;
