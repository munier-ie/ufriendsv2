const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { z } = require('zod');
const authenticateUser = require('../middleware/auth');
const pinRateLimit = require('../middleware/pinRateLimit');
const { clearPinFailures, rejectInvalidPin } = require('../utils/pinAttempts');
const bcrypt = require('bcryptjs');
const { recordWalletCredit } = require('../services/security.service');
const walletOps = require('../services/wallet.service');

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
router.post('/withdraw', authenticateUser, pinRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const { pin } = req.body;
        if (!pin) return res.status(400).json({ error: 'Transaction PIN required' });
        if (!user.transactionPin) return res.status(400).json({ error: 'No transaction PIN set.' });

        const validPin = await bcrypt.compare(pin, user.transactionPin);
        if (!validPin) {
            return rejectInvalidPin(req, res, { message: 'Incorrect PIN' });
        }
        await clearPinFailures(req);

        if (user.refWallet <= 0) {
            return res.status(400).json({ error: 'Insufficient referral balance' });
        }

        // Default to withdrawing all if amount not specified
        const withdrawAmount = amount ? parseFloat(amount) : user.refWallet;

        if (withdrawAmount > user.refWallet) {
            return res.status(400).json({ error: 'Insufficient referral balance' });
        }

        // Get minimum withdrawal from settings
        const settingsService = require('../services/settings.service');
        const minWithdrawal = await settingsService.getSetting('referralMinBalance', 100);

        if (withdrawAmount < minWithdrawal) {
            return res.status(400).json({ error: `Minimum withdrawal is ₦${minWithdrawal}` });
        }

        // Perform Transfer
        const depRef = `REF_DEP_${Date.now()}_${userId}`;
        const debitRef = `REF_WD_${Date.now()}_${userId}`;
        await walletOps.transaction(async (tx) => {
            const debited = await walletOps.debit(tx, userId, withdrawAmount, { field: 'refWallet', source: 'referral_withdrawal', reference: debitRef });
            const credited = await walletOps.credit(tx, userId, withdrawAmount, { source: 'referral_withdrawal', reference: depRef });

            // Record Debit from Ref Wallet
            await tx.transaction.create({
                data: {
                    reference: debitRef,
                    serviceName: 'Referral Withdraw',
                    description: `Withdrew N${withdrawAmount} from Referral Wallet to Main Wallet`,
                    amount: withdrawAmount,
                    status: 0,
                    oldBalance: debited.refWallet + withdrawAmount,
                    newBalance: debited.refWallet,
                    type: 'referral_withdraw',
                    userId
                }
            });

            // Record Credit to Main Wallet
            await tx.transaction.create({
                data: {
                    reference: depRef,
                    serviceName: 'Wallet Fund',
                    description: `Funded N${withdrawAmount} from Referral Wallet`,
                    amount: withdrawAmount,
                    status: 0,
                    oldBalance: credited.wallet - withdrawAmount,
                    newBalance: credited.wallet,
                    type: 'wallet_fund',
                    userId
                }
            });

            await recordWalletCredit(tx, {
                user,
                amount: withdrawAmount,
                previousBalance: credited.wallet - withdrawAmount,
                newBalance: credited.wallet,
                type: 'referral_withdrawal',
                channel: 'referral',
                reference: depRef,
                description: `Funded ₦${withdrawAmount} from Referral Bonus Wallet`,
                initiatedBy: user.phone,
                metadata: { withdrawAmount }
            });
        });

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
