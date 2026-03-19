const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema
const examPinSchema = z.object({
    examType: z.enum(['WAEC', 'NECO', 'NABTEB']),
    quantity: z.number().int().min(1),
    userPrice: z.number().positive(),
    agentPrice: z.number().positive(),
    vendorPrice: z.number().positive(),
    apiPrice: z.number().positive(),
    apiProviderId: z.number().int().optional(),
    referralCommission: z.number().nonnegative().optional().default(0),
    active: z.boolean().optional()
});

// GET /api/admin/exam-pins - List all
router.get('/', adminAuth, async (req, res) => {
    try {
        const pins = await prisma.examPin.findMany({
            include: {
                apiProvider: { select: { name: true } }
            },
            orderBy: { examType: 'asc' }
        });

        const providers = await prisma.apiProvider.findMany({
            select: { id: true, name: true }
        });

        res.json({ success: true, pins, providers });
    } catch (error) {
        console.error('Fetch exam pins error:', error);
        res.status(500).json({ error: 'Failed to fetch exam pins' });
    }
});

// POST /api/admin/exam-pins - Create
router.post('/', adminAuth, async (req, res) => {
    try {
        const data = examPinSchema.parse(req.body);

        const pin = await prisma.examPin.create({
            data: {
                ...data,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Exam pin configuration created', pin });
    } catch (error) {
        console.error('Create exam pin error:', error);
        res.status(400).json({ error: error.message || 'Failed to create configuration' });
    }
});

// PUT /api/admin/exam-pins/:id - Update
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const data = examPinSchema.parse(req.body);

        const pin = await prisma.examPin.update({
            where: { id: parseInt(id) },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, message: 'Configuration updated', pin });
    } catch (error) {
        console.error('Update exam pin error:', error);
        res.status(400).json({ error: error.message || 'Failed to update configuration' });
    }
});

// DELETE /api/admin/exam-pins/:id - Delete
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.examPin.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Configuration deleted' });
    } catch (error) {
        console.error('Delete exam pin error:', error);
        res.status(500).json({ error: 'Failed to delete configuration' });
    }
});

module.exports = router;
