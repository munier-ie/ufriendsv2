const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const { z } = require('zod');
const crypto = require('crypto');
const vendService = require('../services/vend.service');
const { creditReferralBonus } = require('../services/referral.service');

// Schema for purchasing a pin
const purchasePinSchema = z.object({
    serviceId: z.number(),
    quantity: z.number().min(1).default(1),
    amount: z.number().positive(), // Expected amount per pin for validation
    pin: z.string().length(4),
    businessName: z.string().optional() // For Data Pins
});

// GET /api/pins/available/:serviceId
// Check availability of pins for a specific service
router.get('/available/:serviceId', authenticateUser, async (req, res) => {
    try {
        const { serviceId } = req.params;
        const id = parseInt(serviceId);
        const service = await prisma.service.findUnique({ where: { id } });

        if (!service) return res.status(404).json({ error: 'Service not found' });

        // Check physical stock
        const count = await prisma.pin.count({
            where: { serviceId: parseInt(serviceId), status: 0 }
        });

        // Exam and Data Pin services fall back to API vending when stock is 0
        if (count === 0 && (service.type === 'exam' || service.type === 'data_pin')) {
            return res.json({ available: 100, isApiVending: true });
        }

        res.json({ available: count });
    } catch (error) {
        console.error('Check availability error:', error);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

// POST /api/pins/purchase
// Purchase one or more pins
router.post('/purchase', authenticateUser, async (req, res) => {
    try {
        const validation = purchasePinSchema.safeParse(req.body);
        if (!validation.success) {
            const firstIssue = validation.error.issues?.[0]?.message || 'Invalid request data';
            return res.status(400).json({ error: firstIssue });
        }

        const { serviceId, quantity, amount, pin, businessName } = validation.data;

        // 1. Verify Transaction PIN
        if (!req.user.transactionPin) {
            return res.status(400).json({ error: 'No transaction PIN set.' });
        }

        const bcrypt = require('bcryptjs');
        const valid = await bcrypt.compare(pin, req.user.transactionPin);
        if (!valid) return res.status(400).json({ error: 'Invalid transaction PIN' });

        // 2. Get Service details — all services (including exam) now live in the Service table
        let service = await prisma.service.findUnique({ where: { id: serviceId } });

        if (!service || !service.active) {
            return res.status(404).json({ error: 'Service not available' });
        }

        // 3. Determine correct price based on user type
        let userPrice = service.price;
        if (req.user.type === 2 && service.agentPrice) userPrice = service.agentPrice;
        if (req.user.type === 3 && service.vendorPrice) userPrice = service.vendorPrice;

        const totalCost = userPrice * quantity;

        // 4. Check User Balance
        if (req.user.wallet < totalCost) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 5. Check Stock
        const availablePins = await prisma.pin.findMany({
            where: { serviceId, status: 0 },
            take: quantity
        });

        console.log(`[PinPurchase] ID: ${serviceId}, Name: ${service.name}, Type: ${service.type}, Qty: ${quantity}, InStock: ${availablePins.length}`);

        if (availablePins.length < quantity) {
            // STOCK EMPTY -> Check if we can VEND via API
            if (service.type === 'exam' || service.type === 'data_pin') {
                console.log(`[PinPurchase] Falling back to API vending for ${service.type}`);
                return await handleApiPinVending(req, res, service, quantity, totalCost, businessName);
            }
            console.log(`[PinPurchase] Failed: Insufficient stock and not an API-vendable type (${service.type})`);
            return res.status(409).json({ error: 'Insufficient pins in stock, please try a smaller quantity.' });
        }

        // 6. Stock-based Transaction
        const totalApiPrice = service.apiPrice ? (service.apiPrice * quantity) : 0;
        const profit = totalCost - totalApiPrice;

        const result = await prisma.$transaction(async (tx) => {
            const pinIds = availablePins.map(p => p.id);
            const pinContent = availablePins.map(p => p.content).join(', ');

            // Deduct balance
            const updatedUser = await tx.user.update({
                where: { id: req.user.id },
                data: { wallet: { decrement: totalCost } }
            });

            // Mark pins as sold
            await tx.pin.updateMany({
                where: { id: { in: pinIds } },
                data: {
                    status: 1,
                    soldTo: req.user.id,
                    soldAt: new Date()
                }
            });

            // Create transaction record
            const transaction = await tx.transaction.create({
                data: {
                    reference: crypto.randomUUID(),
                    serviceName: service.name,
                    description: `Purchased ${quantity} ${service.name} PIN(s)`,
                    amount: -totalCost,
                    status: 0, // Success
                    oldBalance: req.user.wallet,
                    newBalance: req.user.wallet - totalCost,
                    profit: profit,
                    userId: req.user.id,
                    type: 'pin',
                    pinContent: pinContent
                }
            });

            return { transaction, pins: availablePins, updatedUser };
        });

        // Trigger referral bonus
        creditReferralBonus(req.user.id, service.type, service.referralCommission || 0).catch(err => console.error('Pin Bonus error:', err));

        res.json({
            message: 'Pins purchased successfully',
            pins: result.pins,
            transaction: result.transaction,
            newBalance: result.updatedUser.wallet
        });

    } catch (error) {
        console.error('Pin purchase error:', error);
        res.status(500).json({ error: 'Transaction failed. Please contact support.' });
    }
});

/**
 * Handle API-based PIN vending when stock is empty
 */
async function handleApiPinVending(req, res, service, quantity, totalCost, businessName) {
    // 1. Create Pending Transaction
    const transaction = await prisma.transaction.create({
        data: {
            reference: crypto.randomUUID(),
            serviceName: service.name,
            description: `Vending ${quantity} ${service.name} PIN(s)`,
            amount: -totalCost,
            status: 0, // Success (but we might fail later, vendService handles rollback)
            oldBalance: req.user.wallet,
            newBalance: req.user.wallet - totalCost,
            profit: totalCost - (service.apiPrice ? (service.apiPrice * quantity) : 0),
            userId: req.user.id,
            type: 'pin'
        }
    });

    // 2. Deduct Balance (Pre-emptively)
    await prisma.user.update({
        where: { id: req.user.id },
        data: { wallet: { decrement: totalCost } }
    });

    // 3. Call Vending Service
    let result;
    if (service.type === 'exam') {
        // service.code already contains the eduType (NEONE, WATWO etc.)
        // vend.service.js reads service.code directly, quantity is just a formality here
        result = await vendService.vendExam(transaction, service, 1, req.user.phone);
    } else {
        result = await vendService.vendDataPin(transaction, service, quantity, req.user.phone, businessName);
    }

    if (result.status === 'success' || result.status === 'pending') {
        // Fetch updated transaction to get the pinContent if it was updated
        const updatedTx = await prisma.transaction.findUnique({ where: { id: transaction.id } });
        res.json({
            message: result.message,
            pin: result.pin || updatedTx.pinContent,
            transaction: updatedTx,
            newBalance: req.user.wallet - totalCost
        });

        // Trigger referral bonus
        creditReferralBonus(req.user.id, service.type, service.referralCommission || 0).catch(err => console.error('API Pin Bonus error:', err));
    } else {
        // vendService handles rollback on failure already (deducts then increments back)
        // BUT wait, vendService might have already failed.
        res.status(400).json({ error: result.message || 'API Vending Failed' });
    }
}

module.exports = router;
