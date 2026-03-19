const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authenticateUser = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const monnifyService = require('../services/monnify.service');
const paymentpointService = require('../services/paymentpoint.service');

const prisma = new PrismaClient();

/**
 * @route   POST /api/kyc/verify-nin
 * @desc    Verify user's NIN and create virtual accounts
 * @access  Private
 */
router.post('/verify-nin', authenticateUser, async (req, res) => {
    try {
        const { nin } = req.body;
        const userId = req.user.id;

        // Validate NIN format (11 digits)
        if (!nin || nin.length !== 11 || !/^\d{11}$/.test(nin)) {
            return res.status(400).json({ error: 'Invalid NIN format. Must be 11 digits.' });
        }

        // Check if user already verified
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.kycStatus === 'verified') {
            return res.status(400).json({ error: 'KYC already verified' });
        }

        // TODO: Call NIN verification API (Flutterwave, Youverify, Dojah, etc.)
        // For now, we'll simulate verification
        const ninVerified = true; // Replace with actual API call

        if (!ninVerified) {
            return res.status(400).json({ error: 'NIN verification failed' });
        }

        // Encrypt NIN before storing
        const encryptedNin = encrypt(nin);

        // Update user with NIN and KYC status
        await prisma.user.update({
            where: { id: userId },
            data: {
                nin: encryptedNin,
                kycStatus: 'verified'
            }
        });

        // Create virtual accounts with both gateways
        const accountCreationResults = await createVirtualAccounts(userId);

        res.json({
            success: true,
            message: 'NIN verified successfully',
            kycStatus: 'verified',
            virtualAccounts: accountCreationResults
        });
    } catch (error) {
        console.error('NIN verification error:', error);
        res.status(500).json({ error: 'Failed to verify NIN' });
    }
});

/**
 * @route   POST /api/kyc/verify-bvn
 * @desc    Verify user's BVN and create virtual accounts
 * @access  Private
 */
router.post('/verify-bvn', authenticateUser, async (req, res) => {
    try {
        const { bvn } = req.body;
        const userId = req.user.id;

        // Validate BVN format (11 digits)
        if (!bvn || bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
            return res.status(400).json({ error: 'Invalid BVN format. Must be 11 digits.' });
        }

        // Check if user already verified
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.kycStatus === 'verified') {
            return res.status(400).json({ error: 'KYC already verified' });
        }

        // TODO: Call BVN verification API
        const bvnVerified = true; // Replace with actual API call

        if (!bvnVerified) {
            return res.status(400).json({ error: 'BVN verification failed' });
        }

        // Encrypt BVN before storing
        const encryptedBvn = encrypt(bvn);

        // Update user with BVN and KYC status
        await prisma.user.update({
            where: { id: userId },
            data: {
                bvn: encryptedBvn,
                kycStatus: 'verified'
            }
        });

        // Create virtual accounts with both gateways
        const accountCreationResults = await createVirtualAccounts(userId);

        res.json({
            success: true,
            message: 'BVN verified successfully',
            kycStatus: 'verified',
            virtualAccounts: accountCreationResults
        });
    } catch (error) {
        console.error('BVN verification error:', error);
        res.status(500).json({ error: 'Failed to verify BVN' });
    }
});

/**
 * @route   GET /api/kyc/status
 * @desc    Get user's KYC status and virtual accounts
 * @access  Private
 */
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                kycStatus: true,
                bankName: true,
                bankNo: true,
                rolexBank: true,
                sterlingBank: true,
                fidelityBank: true,
                gtBank: true,
                accountReference: true
            }
        });

        res.json({
            success: true,
            kycStatus: user.kycStatus,
            virtualAccounts: user.kycStatus === 'verified' ? {
                primary: {
                    bankName: user.bankName,
                    accountNumber: user.bankNo,
                    accountName: `${req.user.firstName} ${req.user.lastName}`.toUpperCase()
                },
                secondary: [
                    user.rolexBank && { bank: 'Monie Point', accountNumber: user.rolexBank },
                    user.sterlingBank && { bank: 'Sterling Bank', accountNumber: user.sterlingBank },
                    user.fidelityBank && { bank: 'Fidelity Bank', accountNumber: user.fidelityBank },
                    user.gtBank && { bank: 'GTBank', accountNumber: user.gtBank }
                ].filter(Boolean),
                reference: user.accountReference
            } : null
        });
    } catch (error) {
        console.error('KYC status error:', error);
        res.status(500).json({ error: 'Failed to fetch KYC status' });
    }
});

/**
 * Internal function to create virtual accounts with Monnify (requires KYC)
 * PaymentPoint accounts are created separately via /api/virtual-accounts/create-paymentpoint (NO KYC)
 * Called after successful KYC verification
 */
async function createVirtualAccounts(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    const results = {
        monnify: null,
        note: 'PaymentPoint accounts can be created separately without KYC'
    };

    // Decrypt BVN/NIN for Monnify API calls
    const bvn = user.bvn ? decrypt(user.bvn) : null;
    const nin = user.nin ? decrypt(user.nin) : null;

    // Create Monnify virtual accounts (requires BVN/NIN)
    if (monnifyService.isEnabled && bvn) {
        try {
            const monnifyResponse = await monnifyService.createVirtualAccount({
                userId: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                bvn,
                nin
            });

            if (monnifyResponse.success) {
                results.monnify = monnifyResponse;

                // Save all Monnify accounts to database
                const accounts = monnifyResponse.accounts;
                const updateData = {
                    accountReference: monnifyResponse.accountReference
                };

                accounts.forEach((acc, index) => {
                    if (index === 0) {
                        // Only update if no PaymentPoint account exists
                        if (!user.bankNo) {
                            updateData.bankName = acc.bankName;
                            updateData.bankNo = acc.accountNumber;
                        }
                    }

                    // Store secondary accounts
                    if (acc.bankName.includes('Monie') || acc.bankName.includes('Rolex')) {
                        updateData.rolexBank = acc.accountNumber;
                    } else if (acc.bankName.includes('Sterling')) {
                        updateData.sterlingBank = acc.accountNumber;
                    } else if (acc.bankName.includes('Fidelity')) {
                        updateData.fidelityBank = acc.accountNumber;
                    } else if (acc.bankName.includes('GT') || acc.bankName.includes('Guaranty')) {
                        updateData.gtBank = acc.accountNumber;
                    }
                });

                await prisma.user.update({
                    where: { id: userId },
                    data: updateData
                });
            }
        } catch (error) {
            console.error('Monnify account creation error:', error);
            results.monnify = { error: error.message };
        }
    } else {
        results.monnify = { error: 'BVN is required for Monnify accounts' };
    }

    return results;
}

module.exports = router;
