const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');

// ====== Custom Provider Routing ======

// GET /api/admin/routing
// Fetch all custom provider routing rules
router.get('/', adminAuth, async (req, res) => {
    try {
        const routings = await prisma.providerRouting.findMany({
            include: {
                apiProvider: {
                    select: { name: true, id: true }
                }
            },
            orderBy: [
                { serviceType: 'asc' },
                { network: 'asc' },
                { networkType: 'asc' }
            ]
        });

        // Get active generic providers for context
        const activeProviders = await prisma.activeProvider.findMany({
            include: { apiProvider: { select: { name: true } } }
        });

        res.json({ success: true, routings, activeProviders });
    } catch (error) {
        console.error('Fetch provider routing error:', error);
        res.status(500).json({ error: 'Failed to fetch provider routing rules' });
    }
});

// POST /api/admin/routing
// Create or Update a custom provider routing rule
router.post('/', adminAuth, async (req, res) => {
    try {
        const { serviceType, network, networkType, apiProviderId, active } = req.body;

        if (!serviceType || !network || !networkType || !apiProviderId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const routing = await prisma.providerRouting.upsert({
            where: {
                serviceType_network_networkType: {
                    serviceType,
                    network: network.toUpperCase(),
                    networkType
                }
            },
            update: {
                apiProviderId: parseInt(apiProviderId),
                active: active !== undefined ? active : true,
                updatedAt: new Date()
            },
            create: {
                serviceType,
                network: network.toUpperCase(),
                networkType,
                apiProviderId: parseInt(apiProviderId),
                active: active !== undefined ? active : true,
                updatedAt: new Date()
            }
        });

        // Fetch back with provider name
        const updatedRule = await prisma.providerRouting.findUnique({
            where: { id: routing.id },
            include: { apiProvider: { select: { name: true } } }
        });

        res.json({ success: true, message: 'Routing rule saved successfully', routing: updatedRule });
    } catch (error) {
        console.error('Save provider routing error:', error);
        res.status(500).json({ error: 'Failed to save routing rule' });
    }
});

// DELETE /api/admin/routing/:id
// Delete a custom provider routing rule
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.providerRouting.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: 'Routing rule deleted successfully' });
    } catch (error) {
        console.error('Delete provider routing error:', error);
        res.status(500).json({ error: 'Failed to delete routing rule' });
    }
});

module.exports = router;
