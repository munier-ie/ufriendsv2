const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');

/**
 * @route GET /api/admin/provider-status
 * @desc Get the active provider for all service types
 */
router.get('/', adminAuth, async (req, res) => {
    try {
        const activeProviders = await prisma.activeProvider.findMany({
            include: {
                apiProvider: {
                    select: { id: true, name: true, active: true }
                }
            }
        });

        // Get all available providers for the dropdowns
        const allProviders = await prisma.apiProvider.findMany({
            where: { active: true },
            select: { id: true, name: true }
        });

        res.json({ activeProviders, allProviders });
    } catch (error) {
        console.error('Error fetching provider status:', error);
        res.status(500).json({ error: 'Server error fetching provider status' });
    }
});

/**
 * @route PUT /api/admin/provider-status
 * @desc Update the active provider for a specific service type
 */
router.put('/', adminAuth, async (req, res) => {
    try {
        const { serviceType, apiProviderId } = req.body;

        if (!serviceType || !apiProviderId) {
            return res.status(400).json({ error: 'Service type and API provider ID are required' });
        }

        // Verify the provider exists
        const provider = await prisma.apiProvider.findUnique({
            where: { id: Number(apiProviderId) }
        });

        if (!provider) {
            return res.status(404).json({ error: 'API Provider not found' });
        }

        const activeProvider = await prisma.activeProvider.upsert({
            where: { serviceType },
            update: { apiProviderId: Number(apiProviderId) },
            create: {
                serviceType,
                apiProviderId: Number(apiProviderId)
            },
            include: {
                apiProvider: {
                    select: { id: true, name: true }
                }
            }
        });

        res.json({ message: 'Active provider updated successfully', activeProvider });
    } catch (error) {
        console.error('Error updating provider status:', error);
        res.status(500).json({ error: 'Server error updating provider status' });
    }
});

module.exports = router;
