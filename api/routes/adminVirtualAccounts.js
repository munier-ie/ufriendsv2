const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');

// GET /api/admin/virtual-accounts - List all virtual accounts
router.get('/', adminAuth, async (req, res) => {
    try {
        const { limit = 50, offset = 0, search } = req.query;
        const where = {
            OR: [
                { bankNo: { not: null } },
                { rolexBank: { not: null } },
                { sterlingBank: { not: null } },
                { fidelityBank: { not: null } },
                { gtBank: { not: null } }
            ]
        };

        const usersWithAccounts = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                bankName: true,
                bankNo: true,
                rolexBank: true,
                sterlingBank: true,
                fidelityBank: true,
                gtBank: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        let allAccounts = [];
        usersWithAccounts.forEach(user => {
            const userName = `${user.firstName} ${user.lastName}`;
            if (user.bankNo) {
                allAccounts.push({
                    id: `pp_${user.id}`,
                    accountName: userName.toUpperCase(),
                    accountNumber: user.bankNo,
                    bankName: user.bankName || 'Palmpay',
                    provider: user.bankName?.includes('PaymentPoint') ? 'PaymentPoint' : 'Monnify',
                    user: user,
                    createdAt: user.createdAt
                });
            }
            if (user.rolexBank) {
                allAccounts.push({
                    id: `rolex_${user.id}`,
                    accountName: userName.toUpperCase(),
                    accountNumber: user.rolexBank,
                    bankName: 'Monie Point MFB',
                    provider: 'Monnify',
                    user: user,
                    createdAt: user.createdAt
                });
            }
            if (user.sterlingBank) {
                allAccounts.push({
                    id: `sterling_${user.id}`,
                    accountName: userName.toUpperCase(),
                    accountNumber: user.sterlingBank,
                    bankName: 'Sterling Bank',
                    provider: 'Monnify',
                    user: user,
                    createdAt: user.createdAt
                });
            }
            if (user.fidelityBank) {
                allAccounts.push({
                    id: `fidelity_${user.id}`,
                    accountName: userName.toUpperCase(),
                    accountNumber: user.fidelityBank,
                    bankName: 'Fidelity Bank',
                    provider: 'Monnify',
                    user: user,
                    createdAt: user.createdAt
                });
            }
            if (user.gtBank) {
                allAccounts.push({
                    id: `gt_${user.id}`,
                    accountName: userName.toUpperCase(),
                    accountNumber: user.gtBank,
                    bankName: 'GTBank',
                    provider: 'Monnify',
                    user: user,
                    createdAt: user.createdAt
                });
            }
        });

        if (search) {
            const lowerSearch = search.toLowerCase();
            allAccounts = allAccounts.filter(acc =>
                acc.accountNumber?.includes(search) ||
                acc.accountName?.toLowerCase().includes(lowerSearch) ||
                acc.bankName?.toLowerCase().includes(lowerSearch) ||
                acc.user.email?.toLowerCase().includes(lowerSearch) ||
                acc.user.firstName?.toLowerCase().includes(lowerSearch) ||
                acc.user.lastName?.toLowerCase().includes(lowerSearch)
            );
        }

        const total = allAccounts.length;
        const paginatedAccounts = allAccounts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

        res.json({ success: true, accounts: paginatedAccounts, total });
    } catch (error) {
        console.error('Fetch virtual accounts error:', error);
        res.status(500).json({ error: 'Failed to fetch virtual accounts' });
    }
});

module.exports = router;
