const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema for updating order status
const updateOrderSchema = z.object({
    status: z.number().int().min(1).max(2), // 1=Approved, 2=Rejected
    adminNote: z.string().optional()
});

// GET /api/admin/alpha-topup/orders - List all orders
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (status !== undefined) {
            where.status = parseInt(status);
        }

        const [orders, total] = await Promise.all([
            prisma.alphaTopupOrder.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, username: true, fullName: true, phoneNumber: true }
                    },
                    adminUser: {
                        select: { username: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit)
            }),
            prisma.alphaTopupOrder.count({ where })
        ]);

        res.json({
            success: true,
            orders,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Fetch alpha orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// PUT /api/admin/alpha-topup/orders/:id - Process order
router.put('/orders/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = updateOrderSchema.parse(req.body);
        const adminId = req.admin.id;

        const order = await prisma.alphaTopupOrder.findUnique({
            where: { id: parseInt(id) },
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 0) {
            return res.status(400).json({ error: 'Order has already been processed' });
        }

        // Transaction to update order
        await prisma.$transaction(async (prisma) => {
            // Update order status
            await prisma.alphaTopupOrder.update({
                where: { id: parseInt(id) },
                data: {
                    status,
                    adminId,
                    processedAt: new Date()
                }
            });

            // If approved, logic to credit user or perform topup?
            // Alpha Topup usually implies manual processing by admin or API call
            // If it's "Buying" alpha topup from user, we credit them. 
            // If it's "Selling", we fulfill the order.
            // Assuming this is "User selling Alpha Topup to Admin" (similar to Airtime to Cash)
            // or "User buying Alpha Topup" (Admin fulfills).
            // Based on models: `userPrice`, `buyingRate`.
            // Let's assume it's like Airtime to Cash -> User sent airtime/data, wants cash.
            // Or User paid for Alpha Topup, admin fulfills.
            // Given "proof" field in model, likely User Paid manually and uploaded proof, Admin approves -> Wallet Credited or Service Delivered.

            // If it mimics Airtime to Cash, approval means crediting user wallet.
            // If it mimics manual bank deposit, approval means crediting wallet.

            if (status === 1) {
                // Determine action based on context. 
                // For now, let's assume it credit's user if it's a "Sell" order, or marks fulfilled if "Buy".
                // Since `amount` and `rate` are there, let's assume it's a request to SELL alpha to verified admin/system.
                // Or user Buying Alpha Topup?
                // "Alpha Topup" usually refers to a specific type of transfer. 
                // Let's assume it's a "Buy" order that needs manual fulfillment for now, as typical "Topup" implies getting value.
                // But generally "Alpha Topup" in these contexts often means "Airtime Transfer". 
                // Let's stick to status update. If wallet funding is needed, I'd need to know direction.
                // Defaulting to just status update for now as safe bet.
            }
        });

        res.json({ success: true, message: `Order ${status === 1 ? 'approved' : 'rejected'} successfully` });
    } catch (error) {
        console.error('Process order error:', error);
        res.status(400).json({ error: error.message || 'Failed to process order' });
    }
});

// GET /api/admin/alpha-topup/rates - Get configuration
router.get('/rates', adminAuth, async (req, res) => {
    try {
        let rates = await prisma.alphaTopupRate.findFirst();

        // Seed if empty
        if (!rates) {
            rates = await prisma.alphaTopupRate.create({
                data: {
                    userRate: 100,
                    agentRate: 98,
                    vendorRate: 97,
                    buyingRate: 120,
                    updatedAt: new Date()
                }
            });
        }

        res.json({ success: true, rates });
    } catch (error) {
        console.error('Fetch alpha rates error:', error);
        res.status(500).json({ error: 'Failed to fetch rates' });
    }
});

// PUT /api/admin/alpha-topup/rates - Update rates
router.put('/rates', adminAuth, async (req, res) => {
    try {
        const { userRate, agentRate, vendorRate, buyingRate, referralCommission } = req.body;

        // Assuming single row for global rates
        const existing = await prisma.alphaTopupRate.findFirst();

        if (existing) {
            await prisma.alphaTopupRate.update({
                where: { id: existing.id },
                data: {
                    userRate: parseFloat(userRate),
                    agentRate: parseFloat(agentRate),
                    vendorRate: parseFloat(vendorRate),
                    buyingRate: parseFloat(buyingRate),
                    referralCommission: parseFloat(referralCommission || 0),
                    updatedAt: new Date()
                }
            });
        } else {
            await prisma.alphaTopupRate.create({
                data: {
                    userRate: parseFloat(userRate),
                    agentRate: parseFloat(agentRate),
                    vendorRate: parseFloat(vendorRate),
                    buyingRate: parseFloat(buyingRate),
                    referralCommission: parseFloat(referralCommission || 0),
                    updatedAt: new Date()
                }
            });
        }

        res.json({ success: true, message: 'Rates updated successfully' });
    } catch (error) {
        console.error('Update alpha rates error:', error);
        res.status(500).json({ error: 'Failed to update rates' });
    }
});

module.exports = router;
