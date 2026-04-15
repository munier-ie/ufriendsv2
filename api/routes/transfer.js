const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { z } = require('zod');
const authenticateUser = require('../middleware/auth');
const crypto = require('crypto');

const transferSchema = z.object({
    recipient: z.string().min(1), // Phone or Email
    amount: z.number().positive(),
    pin: z.string().length(4)
});

/**
 * @route GET /api/transfer/recipient/:query
 * @desc Find a recipient by phone or email
 */
router.get('/recipient/:query', authenticateUser, async (req, res) => {
    try {
        const { query } = req.params;
        const recipient = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: query },
                    { email: query.toLowerCase() }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true
            }
        });

        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        if (recipient.id === req.user.id) {
            return res.status(400).json({ error: 'You cannot transfer to yourself' });
        }

        res.json({ recipient });
    } catch (error) {
        console.error('Find recipient error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route POST /api/transfer
 * @desc Perform P2P wallet transfer
 */
router.post('/', authenticateUser, async (req, res) => {
    try {
        const validation = transferSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        const { recipient: recipientQuery, amount, pin } = validation.data;

        // 1. Get Sender (fresh from DB)
        const sender = await prisma.user.findUnique({ where: { id: req.user.id } });

        // 2. Verify PIN
        if (!sender.transactionPin) {
            return res.status(400).json({ error: 'No transaction PIN set. Please configure a PIN in settings.' });
        }

        const validPin = await bcrypt.compare(pin, sender.transactionPin);
        if (!validPin) {
            return res.status(400).json({ error: 'Invalid transaction PIN' });
        }

        // 3. Verify Balance


        // 4. Find Recipient
        const recipient = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: recipientQuery },
                    { email: recipientQuery.toLowerCase() }
                ]
            }
        });

        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        if (recipient.id === sender.id) {
            return res.status(400).json({ error: 'You cannot transfer to yourself' });
        }

        const ref = `TRF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        // 5. Atomic Transaction
        const result = await prisma.$transaction(async (tx) => {
            // Re-fetch sender inside the transaction to prevent TOCTOU race condition
            const freshSender = await tx.user.findUnique({ where: { id: sender.id } });
            if (freshSender.wallet < amount) {
                throw new Error('Insufficient funds');
            }

            // Deduct from sender
            const updatedSender = await tx.user.update({
                where: { id: sender.id },
                data: { wallet: { decrement: amount } }
            });

            if (updatedSender.wallet < 0) {
                throw new Error('Insufficient funds');
            }

            // Add to recipient
            const updatedRecipient = await tx.user.update({
                where: { id: recipient.id },
                data: { wallet: { increment: amount } }
            });

            // Sender Debit Log (status 0 = Success)
            await tx.transaction.create({
                data: {
                    userId: sender.id,
                    reference: `${ref}-S`, // Unique for sender
                    serviceName: 'Wallet Transfer (Sent)',
                    // [SEC-HIGH-06] Phone numbers omitted from descriptions to prevent PII exposure in logs
                    description: `P2P Transfer to ${recipient.firstName} ${recipient.lastName}`,
                    amount: amount,
                    status: 0,
                    oldBalance: freshSender.wallet,
                    newBalance: updatedSender.wallet,
                    type: 'transfer_debit'
                }
            });

            // Recipient Credit Log
            await tx.transaction.create({
                data: {
                    userId: recipient.id,
                    reference: `${ref}-R`, // Unique for recipient
                    serviceName: 'Wallet Transfer (Received)',
                    // [SEC-HIGH-06] Phone numbers omitted from descriptions to prevent PII exposure in logs
                    description: `P2P Transfer from ${sender.firstName} ${sender.lastName}`,
                    amount: amount,
                    status: 0,
                    oldBalance: recipient.wallet,
                    newBalance: updatedRecipient.wallet,
                    type: 'transfer_credit'
                }
            });

            // Notifications
            await tx.notification.create({
                data: {
                    userId: sender.id,
                    title: 'Transfer Sent',
                    message: `You successfully sent ₦${amount.toLocaleString()} to ${recipient.firstName} ${recipient.lastName}.`
                }
            });

            await tx.notification.create({
                data: {
                    userId: recipient.id,
                    title: 'Transfer Received',
                    message: `You received ₦${amount.toLocaleString()} from ${sender.firstName} ${sender.lastName}.`
                }
            });

            return updatedSender;
        });

        res.json({
            success: true,
            message: 'Transfer successful',
            reference: ref,
            newBalance: result.wallet
        });

    } catch (error) {
        console.error('Transfer error:', error);
        if (error.message === 'Insufficient funds') {
            return res.status(400).json({ error: 'Insufficient funds' });
        }
        res.status(500).json({ error: 'Transfer failed. Please try again.' });
    }
});

module.exports = router;
