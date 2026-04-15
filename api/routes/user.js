const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const authenticateUser = require('../middleware/auth');
const { creditReferralBonus } = require('../services/referral.service');

// Validation schemas
const updateProfileSchema = z.object({
    firstName: z.string().trim().min(2).optional(),
    lastName: z.string().trim().min(2).optional(),
    email: z.string().trim().email().toLowerCase().optional(),
    state: z.string().trim().optional()
});

const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6)
});

const updatePinSchema = z.object({
    currentPin: z.string().length(4).optional(),
    newPin: z.string().length(4)
});

// Get user profile
router.get('/me', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
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
                apiKey: true,
                createdAt: true
            }
        });

        if (user && user.type !== 3) {
            delete user.apiKey;
        }

        res.json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update profile
router.put('/me', authenticateUser, async (req, res) => {
    try {
        const validation = updateProfileSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        const { firstName, lastName, email, state } = validation.data;

        // Check if email is already taken by another user
        if (email && email !== req.user.email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(email && { email }),
                ...(state && { state })
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                state: true
            }
        });

        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update password
router.put('/password', authenticateUser, async (req, res) => {
    try {
        const validation = updatePasswordSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        const { currentPassword, newPassword } = validation.data;

        // Verify current password
        const valid = await bcrypt.compare(currentPassword, req.user.password);
        if (!valid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update transaction PIN
router.put('/pin', authenticateUser, async (req, res) => {
    try {
        const validation = updatePinSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        const { currentPin, newPin } = validation.data;

        // Verify current PIN if user has one
        if (req.user.transactionPin) {
            if (!currentPin) {
                return res.status(400).json({ error: 'Current PIN required' });
            }
            const valid = await bcrypt.compare(currentPin, req.user.transactionPin);
            if (!valid) {
                return res.status(400).json({ error: 'Current PIN is incorrect' });
            }
        }

        // Hash new PIN
        const hashedPin = await bcrypt.hash(newPin, 10);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                transactionPin: hashedPin,
                pinEnabled: true
            }
        });

        res.json({ message: 'Transaction PIN updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get available upgrade plans
router.get('/upgrade-plans', authenticateUser, async (req, res) => {
    try {
        const plans = await prisma.upgradePlan.findMany({
            where: { active: true },
            orderBy: { type: 'asc' }
        });
        res.json({ plans });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Upgrade Account
router.post('/upgrade', authenticateUser, async (req, res) => {
    try {
        const { targetType } = req.body; // 2 for Agent, 3 for Vendor

        // Fetch plan from database
        const plan = await prisma.upgradePlan.findUnique({
            where: { type: targetType, active: true }
        });

        if (!plan) {
            return res.status(400).json({ error: 'Invalid or inactive upgrade plan' });
        }

        const currentType = req.user.type;

        // Prevent downgrade or same-tier upgrade
        if (targetType <= currentType) {
            return res.status(400).json({ error: 'You cannot upgrade to this tier' });
        }

        const fee = parseFloat(plan.price);
        const upgradeName = `${plan.name} Upgrade`;

        // Deduct fee and update type safely with an interactive transaction (Atomic)
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: req.user.id } });
            const currentWallet = parseFloat(user.wallet);

            if (currentWallet < fee) {
                throw new Error(`Insufficient funds. Wallet balance: ₦${currentWallet.toLocaleString()}`);
            }

            const updatedUser = await tx.user.update({
                where: { id: user.id },
                data: {
                    wallet: { decrement: fee },
                    type: targetType
                }
            });

            if (updatedUser.wallet < 0) {
                throw new Error('Insufficient funds.'); // Rollback transaction
            }

            await tx.transaction.create({
                data: {
                    userId: user.id,
                    type: 'upgrade',
                    amount: -fee,
                    serviceName: 'Account Upgrade',
                    description: `Upgraded to ${plan.name}`,
                    status: 0, // Success
                    reference: `UPG_${Date.now()}_${user.id}`,
                    oldBalance: currentWallet,
                    newBalance: updatedUser.wallet
                }
            });

            return updatedUser;
        });

        res.json({
            success: true,
            message: `Successfully upgraded to ${plan.name}`,
            newType: targetType,
            newBalance: result.wallet
        });

        // Credit referral bonus asynchronously
        creditReferralBonus(req.user.id, 'upgrade', plan.referralCommission).catch(err => console.error('Bonus error:', err));

    } catch (error) {
        console.error('Upgrade error:', error);
        if (error.message && error.message.includes('Insufficient funds')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Upgrade failed' });
    }
});

// Get software options and contact number
router.get('/software-options', authenticateUser, async (req, res) => {
    try {
        const [options, whatsappSetting] = await Promise.all([
            prisma.softwareOption.findMany({
                where: { active: true },
                orderBy: [{ category: 'asc' }, { name: 'asc' }]
            }),
            prisma.appSetting.findUnique({
                where: { key: 'software_dev_whatsapp' }
            })
        ]);

        res.json({
            options,
            whatsappNumber: whatsappSetting?.value || '2347026417709'
        });
    } catch (error) {
        console.error('Error fetching software options:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/user/support - Get user's support messages
router.get('/support', authenticateUser, async (req, res) => {
    try {
        const messages = await prisma.contactMessage.findMany({
            where: { email: req.user.email },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Fetch support messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/user/support - Create a new support message
router.post('/support', authenticateUser, async (req, res) => {
    try {
        const { subject, message } = z.object({
            subject: z.string().min(3),
            message: z.string().min(10)
        }).parse(req.body);

        const newMessage = await prisma.contactMessage.create({
            data: {
                name: `${req.user.firstName} ${req.user.lastName}`,
                email: req.user.email,
                subject,
                message,
                status: 0
            }
        });

        res.json({ success: true, message: 'Message sent successfully', data: newMessage });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input. Please provide a valid subject and message.' });
        }
        console.error('Create support message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
