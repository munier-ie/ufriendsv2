const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema
const electricityProviderSchema = z.object({
    provider: z.string().min(1),
    charge: z.number().min(0),
    active: z.boolean().optional()
});

// GET /api/admin/electricity
router.get('/', adminAuth, async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            where: { type: 'electricity' },
            orderBy: { name: 'asc' }
        });

        const providers = services.map(s => ({
            id: s.id,
            provider: s.name,
            charge: s.price,
            active: s.active
        }));

        res.json({ success: true, providers });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch electricity providers' });
    }
});

// POST /api/admin/electricity
router.post('/', adminAuth, async (req, res) => {
    try {
        const { provider, charge, active } = req.body;

        let safeProvider = provider.toLowerCase();
        if (safeProvider.includes('ikeja')) safeProvider = 'ikeja';
        else if (safeProvider.includes('eko')) safeProvider = 'eko';
        else if (safeProvider.includes('abuja')) safeProvider = 'abuja';
        else if (safeProvider.includes('kano')) safeProvider = 'kano';
        else if (safeProvider.includes('port harcourt') || safeProvider.includes('phed')) safeProvider = 'port harcourt';
        else if (safeProvider.includes('jos')) safeProvider = 'jos';
        else if (safeProvider.includes('ibadan')) safeProvider = 'ibadan';
        else if (safeProvider.includes('kaduna')) safeProvider = 'kaduna';

        const newProvider = await prisma.service.create({
            data: {
                type: 'electricity',
                provider: safeProvider,
                name: provider,
                code: safeProvider,
                price: parseFloat(charge) || 0,
                agentPrice: parseFloat(charge) || 0,
                vendorPrice: parseFloat(charge) || 0,
                apiPrice: 0,
                active: active !== undefined ? active : true,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Provider created', provider: newProvider });
    } catch (error) {
        res.status(400).json({ error: 'Failed to create provider' });
    }
});

// PUT /api/admin/electricity/:id
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { charge, active } = req.body;
        const provider = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                price: parseFloat(charge),
                active,
                updatedAt: new Date()
            }
        });
        res.json({ success: true, message: 'Provider updated', provider });
    } catch (error) {
        res.status(400).json({ error: 'Failed to update provider' });
    }
});

// DELETE /api/admin/electricity/:id
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.service.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Provider deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete provider' });
    }
});

module.exports = router;
