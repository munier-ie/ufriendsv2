const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');

// GET /api/admin/referrals - List all users with referral counts
router.get('/', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { referralCode: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ];
        }

        // This might be expensive on large datasets, but acceptable for now
        // We need users who have referred others
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                referralCode: true,
                refWallet: true,
                createdAt: true,
                _count: {
                    select: { referred: true }
                }
            },
            orderBy: {
                referred: {
                    _count: 'desc'
                }
            },
            skip: parseInt(skip),
            take: parseInt(limit)
        });

        const total = await prisma.user.count({ where });

        res.json({
            success: true,
            referrers: users.map(u => ({
                id: u.id,
                name: `${u.firstName} ${u.lastName}`,
                referralCode: u.referralCode,
                balance: u.refWallet,
                joinedAt: u.createdAt,
                totalReferred: u._count.referred
            })),
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Fetch referrers error:', error);
        res.status(500).json({ error: 'Failed to fetch referral data' });
    }
});

// GET /api/admin/referrals/leaderboard - Top 10 referrers
router.get('/leaderboard', adminAuth, async (req, res) => {
    try {
        const topReferrers = await prisma.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                _count: {
                    select: { referred: true }
                }
            },
            orderBy: {
                referred: {
                    _count: 'desc'
                }
            },
            take: 10
        });

        res.json({
            success: true,
            leaderboard: topReferrers.map(u => ({
                name: `${u.firstName} ${u.lastName}`,
                count: u._count.referred
            }))
        });
    } catch (error) {
        console.error('Fetch leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/admin/referrals/stats - Aggregated stats
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const totalCommissionPaid = await prisma.transaction.aggregate({
            _sum: {
                amount: true
            },
            where: {
                type: 'referral_withdraw'
            }
        });

        const totalReferrals = await prisma.user.count({
            where: {
                referredBy: { not: null }
            }
        });

        res.json({
            success: true,
            totalCommissionPaid: totalCommissionPaid._sum.amount || 0,
            totalReferrals
        });
    } catch (error) {
        console.error('Fetch referral stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
