const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema
const cablePlanSchema = z.object({
    provider: z.enum(['DSTV', 'GOTV', 'STARTIMES']),
    planName: z.string().min(1),
    planId: z.string().min(1),
    duration: z.string().min(1),
    userPrice: z.number().positive(),
    agentPrice: z.number().positive(),
    vendorPrice: z.number().positive(),
    apiPrice: z.number().positive(),
    apiProviderId: z.number().int().optional(),
    active: z.boolean().optional()
});

// GET /api/admin/cable-plans
router.get('/', adminAuth, async (req, res) => {
    try {
        const services = await prisma.service.findMany({
            where: { type: 'cable' },
            orderBy: [{ provider: 'asc' }, { name: 'asc' }]
        });

        const plans = services.map(s => ({
            id: s.id,
            provider: s.provider ? s.provider.toUpperCase() : '',
            planName: s.name,
            planId: s.code,
            duration: 'Monthly',
            userPrice: s.price,
            agentPrice: s.agentPrice,
            vendorPrice: s.vendorPrice,
            apiPrice: s.apiPrice,
            apiProviderId: s.apiProviderId,
            active: s.active
        }));

        const providers = await prisma.apiProvider.findMany({ select: { id: true, name: true } });
        res.json({ success: true, plans, providers });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cable plans' });
    }
});

// POST /api/admin/cable-plans
router.post('/', adminAuth, async (req, res) => {
    try {
        const data = req.body; // Bypassing zod for flexibility with new fields if needed, or validate normally
        const plan = await prisma.service.create({
            data: {
                type: 'cable',
                provider: data.provider.toLowerCase(),
                name: data.planName,
                code: data.planId,
                price: parseFloat(data.userPrice),
                agentPrice: parseFloat(data.agentPrice),
                vendorPrice: parseFloat(data.vendorPrice),
                apiPrice: parseFloat(data.apiPrice),
                apiProviderId: data.apiProviderId ? parseInt(data.apiProviderId) : null,
                active: data.active !== undefined ? data.active : true,
                updatedAt: new Date()
            }
        });
        res.json({ success: true, message: 'Cable plan created', plan });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Failed to create plan' });
    }
});

// PUT /api/admin/cable-plans/:id
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const plan = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                provider: data.provider.toLowerCase(),
                name: data.planName,
                code: data.planId,
                price: parseFloat(data.userPrice),
                agentPrice: parseFloat(data.agentPrice),
                vendorPrice: parseFloat(data.vendorPrice),
                apiPrice: parseFloat(data.apiPrice),
                apiProviderId: data.apiProviderId ? parseInt(data.apiProviderId) : null,
                active: data.active,
                updatedAt: new Date()
            }
        });
        res.json({ success: true, message: 'Cable plan updated', plan });
    } catch (error) {
        res.status(400).json({ error: 'Failed to update plan' });
    }
});

// DELETE /api/admin/cable-plans/:id
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.service.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Cable plan deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

// PUT /api/admin/cable-plans/:id/toggle
router.put('/:id/toggle', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await prisma.service.findUnique({ where: { id: parseInt(id) } });

        const updated = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                active: !plan.active,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: `Plan ${updated.active ? 'activated' : 'deactivated'}`, plan: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle plan status' });
    }
});

module.exports = router;
