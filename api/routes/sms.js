const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const auth = require('../middleware/auth');

// Send Bulk SMS
router.post('/send', auth, async (req, res) => {
    try {
        const { senderId, recipients, message, flash } = req.body;

        if (!senderId || !recipients || !recipients.length || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Calculate Cost
        const recipientCount = recipients.length;
        const pages = Math.ceil(message.length / 160);
        const costPerSms = 2.50; // Should come from DB settings
        const totalCost = recipientCount * pages * costPerSms;

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (user.wallet < totalCost) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // Deduct Balance
        await prisma.user.update({
            where: { id: req.user.id },
            data: { wallet: { decrement: totalCost } }
        });

        // Log Transaction
        await prisma.transaction.create({
            data: {
                userId: req.user.id,
                reference: 'SMS-' + Date.now(),
                serviceName: 'Bulk SMS',
                description: `SMS to ${recipientCount} recipients`,
                amount: totalCost,
                status: 0, // Success (Mock)
                oldBalance: user.wallet,
                newBalance: user.wallet - totalCost,
                profit: totalCost - (costPerSms * recipientCount * pages), // costPerSms is already the "cost" here, but we could make it more explicit if we had a separate apiPrice. For now, we assume costPerSms is the base.
                type: 'utility'
            }
        });

        // In production, integrate with SMS gateway here (e.g. Twilio, EbulkSMS)

        res.json({ message: 'SMS Sent Successfully', cost: totalCost });

    } catch (error) {
        console.error('SMS Error:', error);
        res.status(500).json({ error: 'Failed to send SMS' });
    }
});

module.exports = router;
