const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const walletOps = require('../services/wallet.service');
const authenticateUser = require('../middleware/auth');
const { z } = require('zod');
const subandgain = require('../utils/providers/subandgain');
const providerAttempts = require('../services/providerAttempt.service');
const { randomUUID } = require('node:crypto');

const purchaseSchema = z.object({
    network: z.string().min(1, "Network is required"),
    denomination: z.number().min(100, "Minimum denomination is 100"),
    quantity: z.number().int().min(1).max(10, "Quantity must be between 1 and 10"),
    name: z.string().min(1, "Name on card is required"),
    pin: z.string().length(4, "Transaction PIN must be 4 digits")
});

router.post('/purchase', authenticateUser, async (req, res) => {
    let chargedTransaction;
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
            where: { name: { contains: 'subandgain', mode: 'insensitive' }, active: true }
        });

        if (!apiProvider) {
            return res.status(500).json({ error: 'Subandgain provider not configured' });
        }

        const reference = randomUUID();
        chargedTransaction = await walletOps.transaction(async tx => {
            const updatedUser = await walletOps.debit(tx, userId, totalAmount, { source: 'recharge_card_purchase', reference });
            return tx.transaction.create({ data: {
                reference, userId, serviceName: `Recharge Card Printing (${network.toUpperCase()})`,
                description: `Purchased ${quantity} pins of ₦${denomination} with name "${name}"`,
                amount: -totalAmount, status: 1, oldBalance: updatedUser.wallet + totalAmount,
                newBalance: updatedUser.wallet, type: 'recharge_card'
            } });
        });
        const result = await providerAttempts.execute(chargedTransaction, apiProvider.id, () => subandgain.purchaseEPin({
            network, denomination, name, quantity, requestId: reference
        }, { apiKey: apiProvider.apiKey, username: apiProvider.username }));
        if (result.status === 'success') {
            await prisma.transaction.update({ where: { id: chargedTransaction.id }, data: { status: 0, pinContent: JSON.stringify(result.pins || []) } });
            return res.json({ success: true, status: 'success', reference, message: 'EPin Purchase Successful', pins: result.pins });
        }
        if (result.status === 'pending') return res.status(202).json({ success: true, status: 'pending', reference, message: result.message });
        await walletOps.refund(reference, result.message || 'Recharge card provider rejected purchase');
        return res.status(400).json({ error: result.message || 'Transaction Failed', reference });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues[0].message });
        }
        console.error('Recharge Card Purchase Error:', error);
        if (chargedTransaction) {
            try {
                const pending = await providerAttempts.pending(chargedTransaction, 'Recharge card outcome could not be finalized.');
                return res.status(202).json({ status: 'pending', reference: chargedTransaction.reference, message: pending.message });
            } catch (pendingError) {
                console.error('Recharge card reconciliation alert failed:', pendingError.message);
            }
        }
        if (error.code === 'SECURITY_HOLD') return res.status(403).json({ error: 'Account held for security review', code: error.code });
        res.status(500).json({ error: 'Failed to purchase recharge cards' });
    }
});

module.exports = router;
