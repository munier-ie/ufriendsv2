const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');

// GET /api/admin/sms/config - Get SMS Service Config
router.get('/config', adminAuth, async (req, res) => {
    try {
        // Assuming there is a service with type 'sms' or name containing 'SMS'
        // Or we might store generic SMS settings in a new table? 
        // For now, let's look for a generic "Bulk SMS" service in Service table
        const service = await prisma.service.findFirst({
            where: {
                OR: [
                    { type: 'sms' },
                    { name: { contains: 'Bulk SMS', mode: 'insensitive' } }
                ]
            },
            include: { apiProvider: true }
        });

        if (!service) {
            return res.json({ success: true, config: null });
        }

        res.json({ success: true, config: service });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch SMS config' });
    }
});

// PUT /api/admin/sms/config - Update SMS Service Config
router.put('/config', adminAuth, async (req, res) => {
    try {
        const { id, price, agentPrice, vendorPrice, apiPrice, apiProviderId, active } = req.body;

        const updated = await prisma.service.update({
            where: { id: parseInt(id) },
            data: {
                price: parseFloat(price),
                agentPrice: parseFloat(agentPrice),
                vendorPrice: parseFloat(vendorPrice),
                apiPrice: parseFloat(apiPrice),
                apiProviderId: parseInt(apiProviderId),
                active
            }
        });

        res.json({ success: true, message: 'SMS configuration updated', config: updated });
    } catch (error) {
        res.status(400).json({ error: 'Failed to update SMS configuration' });
    }
});

// GET /api/admin/sms/logs - Get SMS Transactions
router.get('/logs', adminAuth, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const [logs, total] = await Promise.all([
            prisma.transaction.findMany({
                where: {
                    serviceName: { contains: 'SMS', mode: 'insensitive' }
                },
                include: {
                    user: { select: { email: true, firstName: true, lastName: true } }
                },
                take: parseInt(limit),
                skip: parseInt(offset),
                orderBy: { date: 'desc' }
            }),
            prisma.transaction.count({
                where: { serviceName: { contains: 'SMS', mode: 'insensitive' } }
            })
        ]);

        res.json({ success: true, logs, total });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch SMS logs' });
    }
});

module.exports = router;
