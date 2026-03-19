const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema for Smile Plan
const smilePlanSchema = z.object({
    planName: z.string().min(3),
    planId: z.string().min(1), // API Plan ID
    duration: z.string(), // e.g., "30 Days"
    dataSize: z.string(), // e.g., "5GB"
    userPrice: z.number().positive(),
    agentPrice: z.number().positive(),
    vendorPrice: z.number().positive(),
    apiPrice: z.number().positive(),
    apiProviderId: z.number().int().optional(),
    referralCommission: z.number().nonnegative().optional().default(0),
    active: z.boolean().optional()
});

// GET /api/admin/smile-plans - List all plans
router.get('/', adminAuth, async (req, res) => {
    try {
        const plans = await prisma.smilePlan.findMany({
            include: {
                apiProvider: { select: { name: true } }
            },
            orderBy: { userPrice: 'asc' }
        });

        // Also fetch providers for the dropdown
        const providers = await prisma.apiProvider.findMany({
            select: { id: true, name: true }
        });

        res.json({ success: true, plans, providers });
    } catch (error) {
        console.error('Fetch smile plans error:', error);
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});

// POST /api/admin/smile-plans - Create plan
router.post('/', adminAuth, async (req, res) => {
    try {
        const data = smilePlanSchema.parse(req.body);

        const plan = await prisma.smilePlan.create({
            data: {
                ...data,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Smile plan created successfully', plan });
    } catch (error) {
        console.error('Create smile plan error:', error);
        res.status(400).json({ error: error.message || 'Failed to create plan' });
    }
});

// PUT /api/admin/smile-plans/:id - Update plan
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const data = smilePlanSchema.parse(req.body);

        const plan = await prisma.smilePlan.update({
            where: { id: parseInt(id) },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Smile plan updated successfully', plan });
    } catch (error) {
        console.error('Update smile plan error:', error);
        res.status(400).json({ error: error.message || 'Failed to update plan' });
    }
});

// PUT /api/admin/smile-plans/:id/toggle - Toggle Status
router.put('/:id/toggle', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body;

        await prisma.smilePlan.update({
            where: { id: parseInt(id) },
            data: { active }
        });

        res.json({ success: true, message: `Plan ${active ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error('Toggle smile plan error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// DELETE /api/admin/smile-plans/:id - Delete plan
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.smilePlan.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Smile plan deleted' });
    } catch (error) {
        console.error('Delete smile plan error:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

module.exports = router;
