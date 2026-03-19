const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { z } = require('zod');
const authenticateUser = require('../middleware/auth');

// GET /api/referrals/stats
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                phone: true,
                refWallet: true,
                referralCode: true // Fetch referralCode
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Count referrals using referredBy field
        const referralCount = await prisma.user.count({
            where: { referredBy: user.referralCode }
        });

        // Get recent referral transactions
        const recentBonus = await prisma.transaction.findMany({
            where: {
                userId: userId,
                type: 'referral'
            },
            take: 5,
            orderBy: { date: 'desc' }
        });

        res.json({
            referralCode: user.referralCode, // Use actual referral code
            referralCount,
            commissionBalance: user.refWallet,
            recentBonus
        });

    } catch (error) {
        console.error('Error fetching referral stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/referrals/withdraw
router.post('/withdraw', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.refWallet <= 0) {
            return res.status(400).json({ error: 'Insufficient referral balance' });
        }

        // Default to withdrawing all if amount not specified
        const withdrawAmount = amount ? parseFloat(amount) : user.refWallet;

        if (withdrawAmount > user.refWallet) {
            return res.status(400).json({ error: 'Insufficient referral balance' });
        }

        if (withdrawAmount < 10) { // Minimum withdrawal
            return res.status(400).json({ error: 'Minimum withdrawal is N10' });
        }

        // Perform Transfer
        const newRefBalance = user.refWallet - withdrawAmount;
        const newMainBalance = user.wallet + withdrawAmount;

        await prisma.$transaction([
            // Deduct from Ref Wallet
            prisma.user.update({
                where: { id: userId },
                data: {
                    refWallet: newRefBalance,
                    wallet: newMainBalance
                }
            }),
            // Record Debit from Ref Wallet
            prisma.transaction.create({
                data: {
                    reference: `REF_WD_${Date.now()}_${userId}`,
                    serviceName: 'Referral Withdraw',
                    description: `Withdrew N${withdrawAmount} from Referral Wallet to Main Wallet`,
                    amount: withdrawAmount,
                    status: 0,
                    oldBalance: user.refWallet,
                    newBalance: newRefBalance,
                    type: 'referral_withdraw',
                    userId
                }
            }),
            // Record Credit to Main Wallet
            prisma.transaction.create({
                data: {
                    reference: `REF_DEP_${Date.now()}_${userId}`,
                    serviceName: 'Wallet Fund',
                    description: `Funded N${withdrawAmount} from Referral Wallet`,
                    amount: withdrawAmount,
                    status: 0,
                    oldBalance: user.wallet,
                    newBalance: newMainBalance,
                    type: 'wallet_fund',
                    userId
                }
            })
        ]);

        res.json({
            success: true,
            message: 'Withdrawal successful',
            newBalance: newMainBalance
        });

    } catch (error) {
        console.error('Error withdrawing referral bonus:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
