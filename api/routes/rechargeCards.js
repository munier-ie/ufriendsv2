const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const { z } = require('zod');
const subandgain = require('../utils/providers/subandgain');

const purchaseSchema = z.object({
    network: z.string().min(1, "Network is required"),
    denomination: z.number().min(100, "Minimum denomination is 100"),
    quantity: z.number().min(1).max(10, "Quantity must be between 1 and 10"),
    name: z.string().min(1, "Name on card is required"),
    pin: z.string().length(4, "Transaction PIN must be 4 digits")
});

router.post('/purchase', authenticateUser, async (req, res) => {
    try {
        const { network, denomination, quantity, name, pin } = purchaseSchema.parse(req.body);
        const userId = req.user.id;

        // 1. Verify Transaction PIN
        const bcrypt = require('bcryptjs');
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user.transactionPin) {
            return res.status(403).json({ error: 'Transaction PIN not set' });
        }
        const valid = await bcrypt.compare(pin, user.transactionPin);
        if (!valid) {
            return res.status(403).json({ error: 'Invalid transaction PIN' });
        }

        // 2. Calculate Total Amount
        const totalAmount = denomination * quantity;

        // 3. Check User Balance
        if (user.wallet < totalAmount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 4. Fetch Subandgain Provider
        const apiProvider = await prisma.apiProvider.findFirst({
            where: { name: { contains: 'subandgain', mode: 'insensitive' } }
        });

        if (!apiProvider) {
            return res.status(500).json({ error: 'Subandgain provider not configured' });
        }

        // 5. Call Provider to Purchase
        const result = await subandgain.purchaseEPin({
            network,
            denomination,
            name,
            quantity
        }, {
            apiKey: apiProvider.apiKey,
            username: apiProvider.username
        });

        if (result.status === 'success') {
            // Deduct balance and create transaction
            const reference = result.reference || require('crypto').randomUUID();
            
            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { wallet: { decrement: totalAmount } }
                });

                await tx.transaction.create({
                    data: {
                        reference: reference,
                        serviceName: `Recharge Card Printing (${network.toUpperCase()})`,
                        description: `Purchased ${quantity} pins of ₦${denomination} with name "${name}"`,
                        amount: totalAmount,
                        status: 0, // Success
                        oldBalance: user.wallet,
                        newBalance: user.wallet - totalAmount,
                        userId: userId,
                        type: 'recharge_card'
                    }
                });
            });

            return res.json({
                success: true,
                message: 'EPin Purchase Successful',
                pins: result.pins // array of {token, serial}
            });
        } else {
            return res.status(400).json({ error: result.message || 'Transaction Failed' });
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        console.error('Recharge Card Purchase Error:', error);
        res.status(500).json({ error: 'Failed to purchase recharge cards' });
    }
});

module.exports = router;
