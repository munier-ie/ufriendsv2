const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authenticateUser = require('../middleware/auth');
const paymentpointService = require('../services/paymentpoint.service');

const prisma = new PrismaClient();

/**
 * @route   POST /api/virtual-accounts/create-paymentpoint
 * @desc    Create PaymentPoint virtual account (NO KYC required)
 * @access  Private
 */
router.post('/create-paymentpoint', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        // Check if user already has a PaymentPoint account
        if (user.bankNo && user.bankName?.includes('PaymentPoint')) {
            return res.status(400).json({
                error: 'PaymentPoint virtual account already exists',
                account: {
                    bankName: user.bankName,
                    accountNumber: user.bankNo
                }
            });
        }

        // Create PaymentPoint virtual account (NO KYC required)
        const paymentpointResponse = await paymentpointService.createVirtualAccount({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            phoneNumber: user.phone,
            bankCodes: ['20946'] // Palmpay
        });

        if (paymentpointResponse.success) {
            // Save to database
            const accountDetails = paymentpointResponse.accountDetails;

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    bankName: 'Palmpay (PaymentPoint)',
                    bankNo: accountDetails.bankAccounts?.[0]?.accountNumber,
                    accountReference: `PP_${user.phone}_${user.id}`,
                    virtualAccountName: accountDetails.bankAccounts?.[0]?.accountName
                }
            });

            return res.json({
                success: true,
                message: 'PaymentPoint virtual account created successfully',
                account: {
                    bankName: 'Palmpay',
                    accountNumber: accountDetails.bankAccounts?.[0]?.accountNumber,
                    accountName: accountDetails.bankAccounts?.[0]?.accountName || `${user.firstName} ${user.lastName}`.toUpperCase(),
                    provider: 'PaymentPoint'
                }
            });
        } else {
            throw new Error('Failed to create PaymentPoint account');
        }
    } catch (error) {
        console.error('PaymentPoint account creation error:', error);
        res.status(500).json({ error: error.message || 'Failed to create virtual account' });
    }
});

/**
 * @route   GET /api/virtual-accounts/my-accounts
 * @desc    Get all user's virtual accounts
 * @access  Private
 */
router.get('/my-accounts', authenticateUser, async (req, res) => {
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
                accountReference: true,
                virtualAccountName: true
            }
        });

        const accounts = [];

        // PaymentPoint account (if exists)
        if (user.bankNo) {
            accounts.push({
                provider: user.bankName?.includes('PaymentPoint') ? 'PaymentPoint' : 'Monnify',
                bankName: user.bankName,
                accountNumber: user.bankNo,
                accountName: user.virtualAccountName || `${req.user.firstName} ${req.user.lastName}`.toUpperCase(),
                isPrimary: true
            });
        }

        // Monnify secondary accounts (only if KYC verified)
        if (user.kycStatus === 'verified') {
            if (user.rolexBank) {
                accounts.push({
                    provider: 'Monnify',
                    bankName: 'Monie Point MFB',
                    accountNumber: user.rolexBank,
                    accountName: user.virtualAccountName || `${req.user.firstName} ${req.user.lastName}`.toUpperCase(),
                    isPrimary: false
                });
            }
            if (user.sterlingBank) {
                accounts.push({
                    provider: 'Monnify',
                    bankName: 'Sterling Bank',
                    accountNumber: user.sterlingBank,
                    accountName: user.virtualAccountName || `${req.user.firstName} ${req.user.lastName}`.toUpperCase(),
                    isPrimary: false
                });
            }
            if (user.fidelityBank) {
                accounts.push({
                    provider: 'Monnify',
                    bankName: 'Fidelity Bank',
                    accountNumber: user.fidelityBank,
                    accountName: user.virtualAccountName || `${req.user.firstName} ${req.user.lastName}`.toUpperCase(),
                    isPrimary: false
                });
            }
            if (user.gtBank) {
                accounts.push({
                    provider: 'Monnify',
                    bankName: 'GTBank',
                    accountNumber: user.gtBank,
                    accountName: user.virtualAccountName || `${req.user.firstName} ${req.user.lastName}`.toUpperCase(),
                    isPrimary: false
                });
            }
        }

        res.json({
            success: true,
            kycStatus: user.kycStatus,
            hasPaymentPointAccount: !!user.bankNo,
            hasMonnifyAccounts: user.kycStatus === 'verified' && (!!user.rolexBank || !!user.sterlingBank),
            accounts
        });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Failed to fetch virtual accounts' });
    }
});

module.exports = router;
