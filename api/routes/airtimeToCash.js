const express = require('express');
const router = express.Router();
const { z } = require('zod');
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const whatsappService = require('../services/whatsapp.service');

// Validation Schema
const requestSchema = z.object({
    network: z.string().min(1, "Network is required"),
    amount: z.number().min(100, "Minimum amount is 100"),
    phoneNumber: z.string().min(10, "Phone number required"),
    pin: z.string().length(4, "Transaction PIN must be 4 digits")
});

/**
 * @route   POST /api/airtime-cash/request
 * @desc    Request to convert airtime to cash
 * @access  Private
 */
router.post('/request', authenticateUser, async (req, res) => {
    try {
        const { network, amount, phoneNumber, pin } = requestSchema.parse(req.body);
        const userId = req.user.id;

        // 1. Verify Transaction PIN
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user.transactionPin || user.transactionPin !== pin) {
            return res.status(403).json({ error: 'Invalid transaction PIN' });
        }

        // 2. Fetch Rate
        const rateData = await prisma.airtimeToCashRate.findUnique({
            where: { network: network.toUpperCase() }
        });

        if (!rateData || !rateData.active) {
            return res.status(400).json({ error: `Airtime to Cash is currently unavailable for ${network}` });
        }

        const percentage = rateData.rate / 100;
        const convertedAmount = amount * percentage;

        // 3. Create Request
        const request = await prisma.airtimeToCashRequest.create({
            data: {
                userId,
                network: network.toUpperCase(),
                amount,
                rate: rateData.rate,
                convertedAmount,
                phoneNumber,
                status: 0 // Pending
            }
        });

        res.status(201).json({
            success: true,
            message: 'Airtime to cash request submitted successfully. Please wait for admin approval.',
            request
        });

        // Send WhatsApp notification to Admin
        const whatsappMessage = `*New Airtime to Cash Request*\n\n` +
            `*User:* ${user.firstName} ${user.lastName} (${user.phone})\n` +
            `*Network:* ${network.toUpperCase()}\n` +
            `*Amount:* ₦${parseFloat(amount).toLocaleString()}\n` +
            `*Converted to:* ₦${parseFloat(convertedAmount).toLocaleString()}\n` +
            `*Phone:* ${phoneNumber}\n\n` +
            `Please log in to process this request.`;

        whatsappService.sendMessage(whatsappMessage)
            .catch(err => console.error('Failed to send admin AirtimeToCash notification whatsapp:', err));

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        console.error('Airtime request error:', error);
        res.status(500).json({ error: 'Request failed: ' + error.message });
    }
});

/**
 * @route   GET /api/airtime-cash/history
 * @desc    Get user's airtime to cash history
 * @access  Private
 */
router.get('/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await prisma.airtimeToCashRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        res.json({ success: true, history });
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

/**
 * @route   GET /api/airtime-cash/rates
 * @desc    Get current rates and receiving numbers
 * @access  Private
 */
router.get('/rates', authenticateUser, async (req, res) => {
    try {
        const [rates, config] = await Promise.all([
            prisma.airtimeToCashRate.findMany({
                where: { active: true },
                select: { network: true, rate: true, phoneNumber: true, active: true }
            }),
            prisma.siteConfig.findFirst({ select: { airtimeToCashNumbers: true } })
        ]);

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

module.exports = router;
