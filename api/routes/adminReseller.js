const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const adminAuth = require('../middleware/adminAuth');

/**
 * @route   GET /api/admin/reseller
 * @desc    Get all reseller requests
 */
router.get('/', adminAuth, async (req, res) => {
    try {
        const requests = await prisma.resellerRequest.findMany({
            where: { paymentStatus: 'paid' },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } }
        });
        res.json(requests);
    } catch (error) {
        console.error('Admin reseller list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   PATCH /api/admin/reseller/:id
 * @desc    Update reseller request status and assets
 */
router.patch('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, apkUrl, playStoreUrl, appStoreUrl, webUrl, adminNote } = req.body;

        const updated = await prisma.resellerRequest.update({
            where: { id: parseInt(id) },
            data: {
                status,
                apkUrl,
                playStoreUrl,
                appStoreUrl,
                webUrl,
                adminNote
            }
        });

        // ─── Automated Notifications ─────────────────────────────────
        if (status === 'completed') {
            const { sendResellerDeploymentReady } = require('../services/email.service');
            sendResellerDeploymentReady(updated)
                .catch(e => console.error('Deployment ready email failed:', e));
        }

        res.json(updated);
    } catch (error) {
        console.error('Admin reseller update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
