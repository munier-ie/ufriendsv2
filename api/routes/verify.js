const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const { z } = require('zod');
const crypto = require('crypto');

// Schema for identity verification
const verifySchema = z.object({
    type: z.enum(['nin', 'bvn', 'pnv']),
    number: z.string().min(10), // NIN/BVN usually 11, Phone 11+
    pin: z.string().length(4)
});

// Mock Verification logic for MVP
const MOCK_DATA = {
    nin: {
        '12345678901': { valid: true, firstName: 'John', lastName: 'Doe', photo: 'https://via.placeholder.com/150' },
        '00000000000': { valid: false }
    },
    bvn: {
        '12345678901': { valid: true, firstName: 'Jane', lastName: 'Doe', dob: '1990-01-01' }
    }
};

// POST /api/verify/identity
router.post('/identity', authenticateUser, async (req, res) => {
    try {
        const validation = verifySchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        const { type, number, pin } = validation.data;

        // 1. Verify PIN (Service usually costs money)
        if (req.user.pin !== pin) {
            return res.status(400).json({ error: 'Invalid transaction PIN' });
        }

        const COST = 50; // Flat fee for verification

        // 2. Check Balance
        if (req.user.wallet < COST) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 3. Mock External Call
        // In production, this would call a real ID verification API
        const mockResult = MOCK_DATA[type]?.[number] || { valid: true, firstName: 'Test', lastName: 'User', note: 'Mock Data' };

        // 4. Execute Transaction
        const result = await prisma.$transaction(async (tx) => {
            // Deduct fee
            const updatedUser = await tx.user.update({
                where: { id: req.user.id },
                data: { wallet: { decrement: COST } }
            });

            // Log Verification
            await tx.verificationLog.create({
                data: {
                    type,
                    identifier: number,
                    status: mockResult.valid ? 0 : 1,
                    response: JSON.stringify(mockResult),
                    userId: req.user.id
                }
            });

            // Create transaction record
            await tx.transaction.create({
                data: {
                    reference: crypto.randomUUID(),
                    serviceName: `${type.toUpperCase()} Verification`,
                    description: `Identity verification for ${number}`,
                    amount: -COST,
                    status: 0,
                    oldBalance: req.user.wallet,
                    newBalance: req.user.wallet - COST,
                    profit: 10, // Example profit
                    userId: req.user.id,
                    type: 'verification'
                }
            });

            return { updatedUser };
        });

        res.json({
            success: true,
            data: mockResult,
            newBalance: result.updatedUser.wallet
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

module.exports = router;
