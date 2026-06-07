const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const monnifyService = require('../services/monnify.service');
const paymentpointService = require('../services/paymentpoint.service');

/**
 * @route   POST /api/kyc/verify-nin
 * @desc    Verify NIN via payment provider — if provider generates an account, NIN is valid.
 * @access  Private
 */
router.post('/verify-nin', authenticateUser, async (req, res) => {
    try {
        const { nin } = req.body;
        const userId = req.user.id;

        if (!nin || nin.length !== 11 || !/^\d{11}$/.test(nin)) {
            return res.status(400).json({ error: 'Invalid NIN format. Must be exactly 11 digits.' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.kycStatus === true) {
            return res.status(400).json({ error: 'KYC already verified.' });
        }

        // Save encrypted NIN to DB immediately for security audit trail
        const encryptedNin = encrypt(nin);
        await prisma.user.update({
            where: { id: userId },
            data: { nin: encryptedNin }
        });

        // Use payment provider as KYC oracle — if it generates an account, NIN is valid
        let paymentpointResponse;
        try {
            paymentpointResponse = await paymentpointService.createVirtualAccount({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phoneNumber: user.phone,
                bankCodes: ['20946'], // Palmpay
                nin
            });
        } catch (providerErr) {
            return res.status(400).json({
                error: 'NIN verification failed: ' + (providerErr.message || 'The provided NIN could not be validated by our payment partner.')
            });
        }

        if (!paymentpointResponse.success) {
            return res.status(400).json({
                error: 'NIN could not be verified. Please check the number and try again.'
            });
        }

        // Provider accepted the NIN and generated an account — mark as verified
        const accountDetails = paymentpointResponse.accountDetails;
        const updateData = { kycStatus: true };
        if (accountDetails?.bankAccounts?.[0]?.accountNumber) {
            updateData.bankName = 'Palmpay (PaymentPoint)';
            updateData.bankNo = accountDetails.bankAccounts[0].accountNumber;
            updateData.accountReference = `PP_${user.phone}_${user.id}`;
            if (accountDetails.bankAccounts[0].accountName) {
                updateData.virtualAccountName = accountDetails.bankAccounts[0].accountName;
            }
        }

        await prisma.user.update({ where: { id: userId }, data: updateData });

        return res.json({
            success: true,
            message: 'NIN verified successfully. Your virtual account has been generated!',
            kycStatus: 'verified',
            account: updateData.bankNo ? {
                bankName: 'Palmpay',
                accountNumber: updateData.bankNo,
                accountName: updateData.virtualAccountName
            } : null
        });
    } catch (error) {
        console.error('NIN KYC error:', error);
        res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
    }
});

/**
 * @route   POST /api/kyc/verify-bvn
 * @desc    Verify BVN via payment provider — if provider generates an account, BVN is valid.
 * @access  Private
 */
router.post('/verify-bvn', authenticateUser, async (req, res) => {
    try {
        const { bvn } = req.body;
        const userId = req.user.id;

        if (!bvn || bvn.length !== 11 || !/^\d{11}$/.test(bvn)) {
            return res.status(400).json({ error: 'Invalid BVN format. Must be exactly 11 digits.' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user.kycStatus === true) {
            return res.status(400).json({ error: 'KYC already verified.' });
        }

        // Save encrypted BVN to DB immediately for security audit trail
        const encryptedBvn = encrypt(bvn);
        await prisma.user.update({
            where: { id: userId },
            data: { bvn: encryptedBvn }
        });

        // Use payment provider as KYC oracle — if it generates an account, BVN is valid
        let paymentpointResponse;
        try {
            paymentpointResponse = await paymentpointService.createVirtualAccount({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phoneNumber: user.phone,
                bankCodes: ['20946'], // Palmpay
                bvn
            });
        } catch (providerErr) {
            return res.status(400).json({
                error: 'BVN verification failed: ' + (providerErr.message || 'The provided BVN could not be validated by our payment partner.')
            });
        }

        if (!paymentpointResponse.success) {
            return res.status(400).json({
                error: 'BVN could not be verified. Please check the number and try again.'
            });
        }

        // Provider accepted the BVN and generated an account — mark as verified
        const accountDetails = paymentpointResponse.accountDetails;
        const updateData = { kycStatus: true };
        if (accountDetails?.bankAccounts?.[0]?.accountNumber) {
            updateData.bankName = 'Palmpay (PaymentPoint)';
            updateData.bankNo = accountDetails.bankAccounts[0].accountNumber;
            updateData.accountReference = `PP_${user.phone}_${user.id}`;
            if (accountDetails.bankAccounts[0].accountName) {
                updateData.virtualAccountName = accountDetails.bankAccounts[0].accountName;
            }
        }

        await prisma.user.update({ where: { id: userId }, data: updateData });

        return res.json({
            success: true,
            message: 'BVN verified successfully. Your virtual account has been generated!',
            kycStatus: 'verified',
            account: updateData.bankNo ? {
                bankName: 'Palmpay',
                accountNumber: updateData.bankNo,
                accountName: updateData.virtualAccountName
            } : null
        });
    } catch (error) {
        console.error('BVN KYC error:', error);
        res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
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
            kycStatus: user.kycStatus ? 'verified' : 'unverified',
            virtualAccounts: user.kycStatus ? {
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
                        updateData.virtualAccountName = acc.accountName;
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

    // Try to create PaymentPoint account if they don't have one (new Palmpay policy)
    if (!user.bankNo || !user.bankName?.includes('PaymentPoint')) {
        try {
            const paymentpointResponse = await paymentpointService.createVirtualAccount({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phoneNumber: user.phone,
                bankCodes: ['20946'], // Palmpay
                bvn,
                nin
            });

            if (paymentpointResponse.success) {
                const accountDetails = paymentpointResponse.accountDetails;
                if (accountDetails.bankAccounts?.[0]?.accountNumber) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            bankName: 'Palmpay (PaymentPoint)',
                            bankNo: accountDetails.bankAccounts[0].accountNumber,
                            accountReference: `PP_${user.phone}_${user.id}`,
                            virtualAccountName: accountDetails.bankAccounts[0].accountName
                        }
                    });
                    results.paymentpoint = paymentpointResponse;
                }
            }
        } catch (error) {
            console.error('PaymentPoint account creation error during KYC:', error.message);
            results.paymentpoint = { error: error.message };
        }
    }

    return results;
}

module.exports = router;
