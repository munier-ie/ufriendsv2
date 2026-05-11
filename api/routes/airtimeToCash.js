const express = require('express');
const router = express.Router();
const { z } = require('zod');
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const whatsappService = require('../services/whatsapp.service');
const airtime2cash = require('../utils/providers/airtime2cash');

// Validation Schema
const requestSchema = z.object({
    network: z.string().min(1, "Network is required"),
    amount: z.number().min(100, "Minimum amount is 100"),
    phoneNumber: z.string().min(10, "Phone number required"),
    pin: z.string().length(4, "Transaction PIN must be 4 digits"),
    transferPin: z.string().length(4, "Transfer PIN must be 4 digits"),
    sessionId: z.string().min(1, "Session ID is required")
});

/**
 * @route   POST /api/airtime-cash/generate-otp
 * @desc    Generate OTP for Airtime to Cash
 * @access  Private
 */
router.post('/generate-otp', authenticateUser, async (req, res) => {
    try {
        const { network, phoneNumber } = req.body;
        const result = await airtime2cash.generateOTP(network, phoneNumber);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/airtime-cash/verify-otp
 * @desc    Verify OTP for Airtime to Cash
 * @access  Private
 */
router.post('/verify-otp', authenticateUser, async (req, res) => {
    try {
        const { network, phoneNumber, otp } = req.body;
        const result = await airtime2cash.verifyOTP(network, phoneNumber, otp);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/airtime-cash/request
 * @desc    Request to convert airtime to cash
 * @access  Private
 */
router.post('/request', authenticateUser, async (req, res) => {
    try {
        const { network, amount, phoneNumber, pin, transferPin, sessionId } = requestSchema.parse(req.body);
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

        // 2. Fetch Rate
        const rateData = await prisma.airtimeToCashRate.findUnique({
            where: { network: network.toUpperCase() }
        });

        if (!rateData || !rateData.active) {
            return res.status(400).json({ error: `Airtime to Cash is currently unavailable for ${network}` });
        }

        const percentage = rateData.rate / 100;
        const convertedAmount = amount * percentage;

        // 3. Call Provider to Transfer
        const reference = require('crypto').randomUUID();
        const transferResult = await airtime2cash.transferAirtime(network.toUpperCase(), phoneNumber, amount, reference, transferPin, sessionId);

        if (transferResult.code === 2000) {
            // Success: Credit User Wallet
            const result = await prisma.$transaction(async (tx) => {
                // Update wallet
                await tx.user.update({
                    where: { id: userId },
                    data: { wallet: { increment: convertedAmount } }
                });

                // Create transaction record
                await tx.transaction.create({
                    data: {
                        reference: reference,
                        serviceName: `Airtime to Cash (${network.toUpperCase()})`,
                        description: `Converted ₦${amount} airtime to cash`,
                        amount: convertedAmount,
                        status: 0, // Success
                        oldBalance: user.wallet,
                        newBalance: user.wallet + convertedAmount,
                        userId: userId,
                        type: 'airtime_cash'
                    }
                });

                // Create request record (for history)
                return await tx.airtimeToCashRequest.create({
                    data: {
                        userId,
                        network: network.toUpperCase(),
                        amount,
                        rate: rateData.rate,
                        convertedAmount,
                        phoneNumber,
                        status: 1 // Completed/Success
                    }
                });
            });

            res.status(201).json({
                success: true,
                message: 'Airtime to cash conversion successful. Your wallet has been credited.',
                request: result
            });

        } else {
            // Failed
            res.status(400).json({
                error: transferResult.message || 'Airtime transfer failed on the provider side.'
            });
        }

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
