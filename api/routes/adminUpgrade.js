const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { z } = require('zod');
const authenticateAdmin = require('../middleware/adminAuth');

// Validation schema for upgrade plans
const upgradePlanSchema = z.object({
    name: z.string().trim().min(2),
    price: z.number().min(0),
    referralCommission: z.number().min(0).optional(),
    features: z.array(z.string()),
    active: z.boolean().optional()
});

// Get all upgrade plans
router.get('/plans', authenticateAdmin, async (req, res) => {
    try {
        const plans = await prisma.upgradePlan.findMany({
            orderBy: { type: 'asc' }
        });
        res.json({ plans });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update an upgrade plan
router.put('/plans/:type', authenticateAdmin, async (req, res) => {
    try {
        const type = parseInt(req.params.type);
        const validation = upgradePlanSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        const plan = await prisma.upgradePlan.update({
            where: { type },
            data: validation.data
        });

        res.json({ message: 'Upgrade plan updated successfully', plan });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Plan not found' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
