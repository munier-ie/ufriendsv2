const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema for updating request status
const updateStatusSchema = z.object({
    status: z.number().int().min(1).max(2), // 1=Approved, 2=Rejected
    adminNotes: z.string().optional()
});

/**
 * @route   GET /api/admin/airtime-cash/requests
 * @desc    List all requests with filters
 */
router.get('/requests', adminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status !== undefined && status !== '') {
            where.status = parseInt(status);
        }

        const [requests, total] = await Promise.all([
            prisma.airtimeToCashRequest.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true, phone: true }
                    },
                    adminUser: {
                        select: { name: true, username: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.airtimeToCashRequest.count({ where })
        ]);

        res.json({
            success: true,
            requests,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Fetch airtime requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

/**
 * @route   PUT /api/admin/airtime-cash/requests/:id
 * @desc    Process (Approve/Reject) request
 */
router.put('/requests/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = updateStatusSchema.parse(req.body);
        const adminId = req.admin.id;

        const request = await prisma.airtimeToCashRequest.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status !== 0) {
            return res.status(400).json({ error: 'Request has already been processed' });
        }

        // Transaction to update request and fund wallet
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update request status
            const updatedRequest = await tx.airtimeToCashRequest.update({
                where: { id: parseInt(id) },
                data: {
                    status,
                    adminId,
                    adminNotes,
                    processedAt: new Date()
                }
            });

            // 2. If approved, fund user wallet
            if (status === 1) {
                const oldBalance = request.user.wallet;
                const newBalance = oldBalance + request.convertedAmount;

                await tx.user.update({
                    where: { id: request.userId },
                    data: { wallet: newBalance }
                });

                // 3. Create transaction record
                await tx.transaction.create({
                    data: {
                        reference: `ATC-${request.id}-${Date.now()}`,
                        userId: request.userId,
                        amount: request.convertedAmount,
                        type: 'utility',
                        serviceName: 'Airtime to Cash',
                        status: 0, // Success
                        description: `Airtime conversion: ${request.network} ${request.amount} (Rate: ${request.rate}%)`,
                        oldBalance: oldBalance,
                        newBalance: newBalance
                    }
                });
            }

            return updatedRequest;
        });

        res.json({
            success: true,
            message: `Request ${status === 1 ? 'approved' : 'rejected'} successfully`,
            request: result
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        console.error('Process request error:', error);
        res.status(500).json({ error: 'Failed to process request: ' + error.message });
    }
});

/**
 * @route   GET /api/admin/airtime-cash/rates
 * @desc    Get current rates and receiving numbers
 */
router.get('/rates', adminAuth, async (req, res) => {
    try {
        let rates = await prisma.airtimeToCashRate.findMany();

        // Seed if empty
        if (rates.length === 0) {
            const defaults = [
                { network: 'MTN', rate: 85, active: true, phoneNumber: '', updatedAt: new Date() },
                { network: 'GLO', rate: 75, active: true, phoneNumber: '', updatedAt: new Date() },
                { network: 'AIRTEL', rate: 80, active: true, phoneNumber: '', updatedAt: new Date() },
                { network: '9MOBILE', rate: 80, active: true, phoneNumber: '', updatedAt: new Date() }
            ];
            await prisma.airtimeToCashRate.createMany({ data: defaults });
            rates = await prisma.airtimeToCashRate.findMany();
        }

        const config = await prisma.siteConfig.findFirst();

        res.json({
            success: true,
            rates,
            receivingNumber: config?.airtimeToCashNumbers || ''
        });
    } catch (error) {
        console.error('Fetch rates error:', error);
        res.status(500).json({ error: 'Failed to fetch rates' });
    }
});

/**
 * @route   PUT /api/admin/airtime-cash/rates
 * @desc    Update rates and receiving numbers
 */
router.put('/rates', adminAuth, async (req, res) => {
    try {
        const { rates, receivingNumber } = req.body; // rates: [{ network, rate, active }]

        await prisma.$transaction(async (tx) => {
            if (rates && Array.isArray(rates)) {
                for (const r of rates) {
                    await tx.airtimeToCashRate.upsert({
                        where: { network: r.network.toUpperCase() },
                        update: {
                            rate: parseFloat(r.rate),
                            phoneNumber: r.phoneNumber || '',
                            active: r.active
                            // updatedAt is handled by @updatedAt
                        },
                        create: {
                            network: r.network.toUpperCase(),
                            rate: parseFloat(r.rate),
                            phoneNumber: r.phoneNumber || '',
                            active: r.active,
                            updatedAt: new Date()
                        }
                    });
                }
            }

            if (receivingNumber !== undefined) {
                const config = await tx.siteConfig.findFirst();
                if (config) {
                    await tx.siteConfig.update({
                        where: { id: config.id },
                        data: { airtimeToCashNumbers: receivingNumber }
                    });
                } else {
                    await tx.siteConfig.create({
                        data: {
                            airtimeToCashNumbers: receivingNumber,
                            updatedAt: new Date()
                        }
                    });
                }
            }
        });

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update rates error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
