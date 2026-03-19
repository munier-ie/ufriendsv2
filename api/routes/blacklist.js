const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema for adding to blacklist
const blacklistSchema = z.object({
    phone: z.string().min(11, "Phone number must be at least 11 digits"),
    reason: z.string().optional()
});

// GET /api/admin/blacklist - List all blacklisted numbers
router.get('/', adminAuth, async (req, res) => {
    try {
        const blacklist = await prisma.blacklistedNumber.findMany({
            include: {
                adminUser: {
                    select: { id: true, username: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, blacklist });
    } catch (error) {
        console.error('Fetch blacklist error:', error);
        res.status(500).json({ error: 'Failed to fetch blacklist' });
    }
});

// POST /api/admin/blacklist - Add number to blacklist
router.post('/', adminAuth, async (req, res) => {
    try {
        const { phone, reason } = blacklistSchema.parse(req.body);
        const adminId = req.admin.id;

        // Check if already exists
        const existing = await prisma.blacklistedNumber.findUnique({
            where: { phone }
        });

        if (existing) {
            return res.status(400).json({ error: 'Number is already blacklisted' });
        }

        const entry = await prisma.blacklistedNumber.create({
            data: {
                phone,
                reason,
                adminId
            },
            include: {
                adminUser: {
                    select: { id: true, username: true, name: true }
                }
            }
        });

        res.json({ success: true, message: 'Number added to blacklist', entry });
    } catch (error) {
        console.error('Add blacklist error:', error);
        res.status(400).json({ error: error.message || 'Failed to blacklist number' });
    }
});

// DELETE /api/admin/blacklist/:id - Remove from blacklist
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.blacklistedNumber.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: 'Number removed from blacklist' });
    } catch (error) {
        console.error('Remove blacklist error:', error);
        res.status(400).json({ error: 'Failed to remove from blacklist' });
    }
});

module.exports = router;
