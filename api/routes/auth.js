const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { sendWelcomeEmail, sendLoginAlert } = require('../services/email.service');
const paymentpointService = require('../services/paymentpoint.service');
const { generateUniqueCode } = require('../utils/referral.utils');

// Validation Schemas
const registerSchema = z.object({
    firstName: z.string().trim().min(2),
    lastName: z.string().trim().min(2),
    email: z.string().trim().email().toLowerCase(),
    phone: z.string().trim().min(10),
    password: z.string().min(6),
    pin: z.string().length(4),
    state: z.string().trim().optional(),
    referral: z.string().trim().optional(),
    type: z.number().int().min(1).max(3).default(1)
});

const loginSchema = z.object({
    phone: z.string().trim().min(10),
    password: z.string().min(1)
});

// Register
router.post('/register', async (req, res) => {
    try {
        // Validate input
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        const { firstName, lastName, email, phone, password, pin, state, referral, type } = validation.data;

        // Check existing
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedPin = await bcrypt.hash(pin, 10);


        let validReferral = null;
        let referredBy = null;

        // Handle Referral Code
        if (referral) {
            const referrer = await prisma.user.findUnique({ where: { referralCode: referral } });
            if (referrer) {
                referredBy = referral;
                // Update referrer's wallet (optional: add bonus logic here later)
            } else {
                // Fallback: check if referral is phone number (legacy support)
                const referrerByPhone = await prisma.user.findUnique({ where: { phone: referral } });
                if (referrerByPhone) {
                    referredBy = referrerByPhone.referralCode;
                }
            }
        }

        const referralCode = await generateUniqueCode(prisma);

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                password: hashedPassword,
                transactionPin: hashedPin, // Use new field
                pinEnabled: true,          // Enable PIN by default
                state,
                referredBy: referredBy,    // Store referrer code
                referral: referral,        // Store raw input for legacy tracking
                referralCode,              // Store new short code
                type: type || 1,
                apiKey: require('crypto').randomBytes(32).toString('hex')
            }
        });

        // Send Welcome Email
        sendWelcomeEmail(user).catch(err => console.error('Email error:', err));

        // Auto-generate PaymentPoint Virtual Account asynchronously without blocking registration response
        paymentpointService.createVirtualAccount({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            phoneNumber: user.phone,
            bankCodes: ['20946'] // Palmpay
        }).then(async (paymentpointResponse) => {
            if (paymentpointResponse.success) {
                const accountDetails = paymentpointResponse.accountDetails;
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        bankName: 'Palmpay (PaymentPoint)',
                        bankNo: accountDetails.bankAccounts?.[0]?.accountNumber,
                        accountReference: `PP_${user.phone}_${user.id}`
                    }
                });
                console.log(`Auto-generated PaymentPoint virtual account for ${user.email}`);
            }
        }).catch(err => {
            console.error(`Failed to auto-generate PaymentPoint virtual account for ${user.email}:`, err.message);
        });

        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        // Validate input
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Invalid input" });
        }

        const { phone, password } = validation.data;

        // Find user
        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        // Strict Bcrypt check only
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        // Single Device Login Logic
        // Invalidate all previous sessions
        await prisma.userLogin.deleteMany({
            where: { userId: user.id }
        });

        // Create new session
        await prisma.userLogin.create({
            data: {
                userId: user.id,
                token: token
            }
        });

        // Send Login Alert
        sendLoginAlert(user, req.headers['user-agent']).catch(err => console.error('Email error:', err));

        // Auto-generate Virtual Account if missing
        if (!user.bankNo) {
            paymentpointService.createVirtualAccount({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phoneNumber: user.phone,
                bankCodes: ['20946'] // Palmpay
            }).then(async (paymentpointResponse) => {
                if (paymentpointResponse.success) {
                    const accountDetails = paymentpointResponse.accountDetails;
                    if (accountDetails.bankAccounts?.[0]?.accountNumber) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                bankName: 'Palmpay (PaymentPoint)',
                                bankNo: accountDetails.bankAccounts[0].accountNumber,
                                accountReference: `PP_${user.phone}_${user.id}`
                            }
                        });
                        console.log(`Auto-generated virtual account on login for ${user.email}`);
                    }
                }
            }).catch(err => {
                console.error(`Failed to auto-generate virtual account on login for ${user.email}:`, err.message);
            });
        }

        res.json({ token, user: { id: user.id, name: `${user.firstName} ${user.lastName}` } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                state: true,
                type: true,
                wallet: true,
                refWallet: true,
                airtimeLimit: true,
                accountLimit: true,
                kycStatus: true,
                pinEnabled: true,
                apiKey: true,
                referralCode: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Count referrals
        const totalReferrals = await prisma.user.count({
            where: { referredBy: user.referralCode }
        });

        const accountTypes = { 1: 'user', 2: 'agent', 3: 'vendor' };

        res.json({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone,
            state: user.state,
            accountType: accountTypes[user.type] || 'user',
            wallet: user.wallet,
            refWallet: user.refWallet,
            airtimeLimit: user.airtimeLimit || 10000,
            accountLimit: user.accountLimit || 500000,
            kycStatus: user.kycStatus || false,
            pinEnabled: user.pinEnabled || false,
            apiKey: user.type === 3 ? user.apiKey : null,
            referralCode: user.referralCode,
            totalReferrals
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Password
router.put('/update-password', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Old and new passwords are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Incorrect old password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: decoded.userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle PIN
router.post('/pin/toggle', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { action, pin, confirmPin, currentPin } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (action === 'enable') {
            if (!pin || !confirmPin) {
                return res.status(400).json({ error: 'PIN and confirmation required' });
            }

            if (pin !== confirmPin) {
                return res.status(400).json({ error: 'PINs do not match' });
            }

            if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
                return res.status(400).json({ error: 'PIN must be 4 digits' });
            }

            const hashedPin = await bcrypt.hash(pin, 10);
            await prisma.user.update({
                where: { id: decoded.userId },
                data: {
                    transactionPin: hashedPin,
                    pinEnabled: true
                }
            });

            res.json({ message: 'PIN enabled successfully' });
        } else if (action === 'disable') {
            if (!currentPin) {
                return res.status(400).json({ error: 'Current PIN required' });
            }

            if (!user.transactionPin) {
                return res.status(400).json({ error: 'No PIN set' });
            }

            const validPin = await bcrypt.compare(currentPin, user.transactionPin);
            if (!validPin) {
                return res.status(400).json({ error: 'Incorrect PIN' });
            }

            await prisma.user.update({
                where: { id: decoded.userId },
                data: { pinEnabled: false }
            });

            res.json({ message: 'PIN disabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get PIN Status
router.get('/pin/status', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { pinEnabled: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ pinEnabled: user.pinEnabled || false });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
