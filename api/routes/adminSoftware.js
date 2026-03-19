const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { z } = require('zod');
const authenticateAdmin = require('../middleware/adminAuth');

// Validation schema for software options
const softwareOptionSchema = z.object({
    category: z.enum(['Software Type', 'Programming Language']),
    name: z.string().trim().min(1),
    active: z.boolean().optional()
});

// Get all software options (admin)
router.get('/options', authenticateAdmin, async (req, res) => {
    try {
        const options = await prisma.softwareOption.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }]
        });
        res.json(options);
    } catch (error) {
        console.error('Error fetching software options:', error);
        res.status(500).json({ error: 'Failed to fetch software options' });
    }
});

// Create software option
router.post('/options', authenticateAdmin, async (req, res) => {
    try {
        const data = softwareOptionSchema.parse(req.body);
        const option = await prisma.softwareOption.create({ data });
        res.status(201).json(option);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        res.status(500).json({ error: 'Failed to create software option' });
    }
});

// Update software option
router.put('/options/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const data = softwareOptionSchema.partial().parse(req.body);
        const option = await prisma.softwareOption.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(option);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update software option' });
    }
});

// Delete software option
router.delete('/options/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.softwareOption.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Option deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete software option' });
    }
});

// --- Settings ---

// Get software development WhatsApp number
router.get('/whatsapp', authenticateAdmin, async (req, res) => {
    try {
        let setting = await prisma.appSetting.findUnique({
            where: { key: 'software_dev_whatsapp' }
        });

        if (!setting) {
            setting = { value: '2347026417709' }; // Fallback
        }

        res.json({ phoneNumber: setting.value });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch WhatsApp number' });
    }
});

// Update software development WhatsApp number
router.put('/whatsapp', authenticateAdmin, async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

        const setting = await prisma.appSetting.upsert({
            where: { key: 'software_dev_whatsapp' },
            update: { value: phoneNumber },
            create: { key: 'software_dev_whatsapp', value: phoneNumber }
        });

        res.json({ phoneNumber: setting.value });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update WhatsApp number' });
    }
});

module.exports = router;
