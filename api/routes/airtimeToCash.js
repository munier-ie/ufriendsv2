const express = require('express');
const router = express.Router();
const { z } = require('zod');
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const pinRateLimit = require('../middleware/pinRateLimit');
const { clearPinFailures, rejectInvalidPin } = require('../utils/pinAttempts');
const whatsappService = require('../services/whatsapp.service');
const airtime2cash = require('../utils/providers/airtime2cash');
const { recordWalletCredit } = require('../services/security.service');
const walletOps = require('../services/wallet.service');
const { ensureAirtimeCashRates, normalizeAirtimeNetwork } = require('../utils/airtimeCashRates');

// Validation Schema
const phoneNumberSchema = z.string()
    .trim()
    .regex(/^0\d{10}$/, 'Phone number must be exactly 11 digits and start with 0');

const requestSchema = z.object({
    network: z.string().min(1, "Network is required"),
    amount: z.number().min(100, "Minimum amount is 100"),
    phoneNumber: phoneNumberSchema,
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
        const { network, phoneNumber } = z.object({
            network: z.string().min(1, 'Network is required'),
            phoneNumber: phoneNumberSchema
        }).parse(req.body);
        const result = await airtime2cash.generateOTP(normalizeAirtimeNetwork(network), phoneNumber);
        if (result?.code !== 2000) {
            return res.status(400).json({ error: result?.message || 'The provider could not send the OTP.', code: result?.code });
        }
        res.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        const providerStatus = error.response?.status;
        const providerMessage = error.response?.data?.message;
        console.error('Airtime2Cash OTP generation failed:', providerStatus || error.message, providerMessage || '');
        res.status(providerStatus === 401 ? 502 : 500).json({
            error: providerStatus === 401
                ? 'Airtime2Cash authentication failed. Please contact support.'
                : (providerMessage || 'Unable to generate OTP at this time')
        });
    }
});

/**
 * @route   POST /api/airtime-cash/verify-otp
 * @desc    Verify OTP for Airtime to Cash
 * @access  Private
 */
router.post('/verify-otp', authenticateUser, async (req, res) => {
    try {
        const { network, phoneNumber, otp } = z.object({
            network: z.string().min(1, 'Network is required'),
            phoneNumber: phoneNumberSchema,
            otp: z.string().trim().min(1, 'OTP is required')
        }).parse(req.body);
        const result = await airtime2cash.verifyOTP(normalizeAirtimeNetwork(network), phoneNumber, otp);
        if (result?.code !== 2000) {
            return res.status(400).json({ error: result?.message || 'The provider could not verify the OTP.', code: result?.code });
        }
        res.json(result);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        const providerStatus = error.response?.status;
        const providerMessage = error.response?.data?.message;
        console.error('Airtime2Cash OTP verification failed:', providerStatus || error.message, providerMessage || '');
        res.status(providerStatus === 401 ? 502 : 500).json({
            error: providerStatus === 401
                ? 'Airtime2Cash authentication failed. Please contact support.'
                : (providerMessage || 'Unable to verify OTP at this time')
        });
    }
});

/**
 * @route   POST /api/airtime-cash/request
 * @desc    Request to convert airtime to cash
 * @access  Private
 */
router.post('/request', authenticateUser, pinRateLimit, async (req, res) => {
    try {
        const parsed = requestSchema.parse(req.body);
        const network = normalizeAirtimeNetwork(parsed.network);
        const { amount, phoneNumber, pin, transferPin, sessionId } = parsed;
        const userId = req.user.id;

        // 1. Verify Transaction PIN
        const bcrypt = require('bcryptjs');
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user.transactionPin) {
            return res.status(403).json({ error: 'Transaction PIN not set' });
        }
        const valid = await bcrypt.compare(pin, user.transactionPin);
        if (!valid) {
            return rejectInvalidPin(req, res, { status: 403 });
        }
        await clearPinFailures(req);

        // 2. Fetch Rate
        await ensureAirtimeCashRates(prisma);
        const rateData = await prisma.airtimeToCashRate.findUnique({ where: { network } });

        if (!rateData) {
            return res.status(503).json({ error: `Airtime to Cash has not been configured for ${network}. Please contact support.` });
        }
        if (!rateData.active) {
            return res.status(503).json({ error: `Airtime to Cash is temporarily disabled for ${network}.` });
        }

        const percentage = rateData.rate / 100;
        const convertedAmount = amount * percentage;

        // 3. Call Provider to Transfer
        const reference = require('crypto').randomUUID();
        const transferResult = await airtime2cash.transferAirtime(network, phoneNumber, amount, reference, transferPin, sessionId);

        if (transferResult.code === 2000) {
            // Success: Credit User Wallet
            const result = await prisma.$transaction(async (tx) => {
                const updatedUser = await walletOps.credit(tx, userId, convertedAmount, { source: 'airtime_to_cash', reference });

                // Create transaction record
                await tx.transaction.create({
                    data: {
                        reference: reference,
                        serviceName: `Airtime to Cash (${network})`,
                        description: `Converted ₦${amount} airtime to cash`,
                        amount: convertedAmount,
                        status: 0, // Success
                        oldBalance: updatedUser.wallet - convertedAmount,
                        newBalance: updatedUser.wallet,
                        userId: userId,
                        type: 'airtime_cash'
                    }
                });

                await recordWalletCredit(tx, {
                    user,
                    amount: convertedAmount,
                    previousBalance: updatedUser.wallet - convertedAmount,
                    newBalance: updatedUser.wallet,
                    type: 'airtime_to_cash',
                    channel: 'airtime_to_cash',
                    reference,
                    description: `Converted ₦${amount} ${network.toUpperCase()} airtime to cash (Rate: ${rateData.rate}%)`,
                    initiatedBy: user.phone,
                    metadata: { network, originalAmount: amount, rate: rateData.rate }
                });

                // Create request record (for history)
                return await tx.airtimeToCashRequest.create({
                    data: {
                        userId,
                        network,
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
        res.status(500).json({ error: 'Request failed. Please try again later.' });
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
        await ensureAirtimeCashRates(prisma);
        const [rates, config] = await Promise.all([
            prisma.airtimeToCashRate.findMany({
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
