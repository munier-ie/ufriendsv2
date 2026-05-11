const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const authenticateUser = require('../middleware/auth');

// Get wallet balance
router.get('/balance', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { wallet: true, refWallet: true, bankName: true, bankNo: true, firstName: true, lastName: true, virtualAccountName: true }
        });

        res.json({
            wallet: user.wallet,
            refWallet: user.refWallet,
            total: user.wallet + user.refWallet,
            bankName: user.bankName,
            bankNo: user.bankNo,
            accountName: user.virtualAccountName || `${user.firstName} ${user.lastName}`.toUpperCase()
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get wallet statistics
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Fetch wallet to get refWallet for cashback
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { refWallet: true }
        });

        // Get total transactions count
        const totalTransactions = await prisma.transaction.count({
            where: { userId }
        });

        const [
            weeklySpentAgg,
            monthlySpentAgg,
            totalSpentAgg,
            totalFundingAgg
        ] = await Promise.all([
            prisma.transaction.aggregate({
                where: { userId, status: 0, amount: { lt: 0 }, date: { gte: oneWeekAgo } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, status: 0, amount: { lt: 0 }, date: { gte: oneMonthAgo } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, status: 0, amount: { lt: 0 } },
                _sum: { amount: true }
            }),
            prisma.transaction.aggregate({
                where: { userId, status: 0, amount: { gt: 0 } },
                _sum: { amount: true }
            })
        ]);

        // For chart data (last 7 days)
        const last7DaysStart = new Date(now);
        last7DaysStart.setHours(0, 0, 0, 0);
        last7DaysStart.setDate(last7DaysStart.getDate() - 6);

        const recentTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                status: 0,
                date: { gte: last7DaysStart }
            },
            select: { amount: true, date: true, type: true }
        });

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            return {
                dateStr: d.toISOString().split('T')[0],
                name: d.toLocaleDateString('en-US', { weekday: 'short' })
            };
        }).reverse();

        const chartData = last7Days.map(({ dateStr, name }) => {
            const dayTxs = recentTransactions.filter(tx => {
                // Handle different timezones safely by string matching
                const txDateStr = new Date(tx.date).toISOString().split('T')[0];
                return txDateStr === dateStr;
            });
            const serviceTypes = ['airtime', 'data', 'cable', 'electricity', 'exam', 'data_pin', 'nin_slip', 'bvn_slip', 'professional', 'pin', 'utility'];
            const spent = dayTxs.filter(tx => tx.amount < 0 && (tx.type === null || tx.type === undefined || serviceTypes.includes(tx.type))).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
            const funded = dayTxs.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);

            return {
                name,
                spent,
                funded
            };
        });

        res.json({
            totalTransactions,
            weeklySpent: Math.abs(weeklySpentAgg._sum.amount || 0),
            monthlySpent: Math.abs(monthlySpentAgg._sum.amount || 0),
            totalSpent: Math.abs(totalSpentAgg._sum.amount || 0),
            totalFunding: totalFundingAgg._sum.amount || 0,
            cashback: user.refWallet || 0,
            chartData
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /wallet/stats/chart?period=7d|1m|1y
// Returns per-day spending data for the requested period.
// "Spending" = successful debit transactions that are NOT funding/deposit/withdrawal/referral/transfer.
router.get('/stats/chart', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const period = (req.query.period || '7d').toLowerCase();

        const now = new Date();
        let daysCount;
        if (period === '1m') daysCount = 30;
        else if (period === '1y') daysCount = 365;
        else daysCount = 7;

        // Start of the window (midnight, local ISO-safe)
        const windowStart = new Date(now);
        windowStart.setHours(0, 0, 0, 0);
        windowStart.setDate(windowStart.getDate() - (daysCount - 1));

        // Excluded transaction types (non-service debits)
        const excludedTypes = ['funding', 'withdrawal', 'deposit', 'referral', 'transfer', 'bonus', 'cashback', 'debit'];

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                status: 0,
                amount: { lt: 0 },
                date: { gte: windowStart },
                NOT: { type: { in: excludedTypes } }
            },
            select: { amount: true, date: true }
        });

        // Build one bucket per day, ordered oldest → newest
        const days = [];
        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - i);
            days.push({
                dateStr: d.toISOString().split('T')[0],
                name: daysCount === 7
                    ? d.toLocaleDateString('en-US', { weekday: 'short' })
                    : daysCount === 30
                        ? `${d.getDate()}`
                        : d.toLocaleDateString('en-US', { month: 'short' })
            });
        }

        const chartData = days.map(({ dateStr, name }) => {
            const dayTxs = transactions.filter(tx => {
                const txDateStr = new Date(tx.date).toISOString().split('T')[0];
                return txDateStr === dateStr;
            });
            const spent = dayTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
            return { name, spent };
        });

        res.json({ chartData, period, daysCount });
    } catch (error) {
        console.error('Chart stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get transaction history
router.get('/transactions', authenticateUser, async (req, res) => {
    try {
        // [SEC-HIGH-05] Cap limit to prevent memory-exhaustion DoS (unbounded pagination)
        const { limit = 50, offset = 0, type, status, search, startDate, endDate } = req.query;
        const rawLimit = Math.min(parseInt(limit) || 50, 200);
        const rawOffset = Math.max(parseInt(offset) || 0, 0);

        const where = { userId: req.user.id };

        if (type && type !== 'all') {
            if (type === 'airtime') {
                where.serviceName = { contains: 'airtime', mode: 'insensitive' };
            } else if (type === 'data' && !type.includes('pin')) {
                // Data plans: serviceName contains 'MB' or 'GB' or 'Data' but NOT airtime, pin, exam
                where.AND = [
                    { OR: [
                        { serviceName: { contains: 'MB', mode: 'insensitive' } },
                        { serviceName: { contains: 'GB', mode: 'insensitive' } },
                        { serviceName: { contains: 'data', mode: 'insensitive' } }
                    ]},
                    { NOT: { serviceName: { contains: 'airtime', mode: 'insensitive' } } },
                    { NOT: { serviceName: { contains: 'pin', mode: 'insensitive' } } },
                    { NOT: { serviceName: { contains: 'exam', mode: 'insensitive' } } }
                ];
            } else if (type === 'cable') {
                where.OR = [
                    { serviceName: { contains: 'dstv', mode: 'insensitive' } },
                    { serviceName: { contains: 'gotv', mode: 'insensitive' } },
                    { serviceName: { contains: 'startimes', mode: 'insensitive' } },
                    { serviceName: { contains: 'cable', mode: 'insensitive' } },
                    { serviceName: { contains: 'showmax', mode: 'insensitive' } }
                ];
            } else if (type === 'electricity') {
                where.OR = [
                    { serviceName: { contains: 'electricity', mode: 'insensitive' } },
                    { serviceName: { contains: 'prepaid', mode: 'insensitive' } },
                    { serviceName: { contains: 'postpaid', mode: 'insensitive' } },
                    { serviceName: { contains: 'keco', mode: 'insensitive' } },
                    { serviceName: { contains: 'ikeja', mode: 'insensitive' } },
                    { serviceName: { contains: 'eko', mode: 'insensitive' } },
                    { serviceName: { contains: 'disco', mode: 'insensitive' } },
                    { serviceName: { contains: 'unit', mode: 'insensitive' } }
                ];
            } else if (type === 'exam') {
                where.OR = [
                    { serviceName: { contains: 'waec', mode: 'insensitive' } },
                    { serviceName: { contains: 'neco', mode: 'insensitive' } },
                    { serviceName: { contains: 'exam', mode: 'insensitive' } },
                    { serviceName: { contains: 'result checker', mode: 'insensitive' } }
                ];
            } else if (type === 'data_pin') {
                where.AND = [
                    { type: 'pin' },
                    { NOT: { serviceName: { contains: 'waec', mode: 'insensitive' } } },
                    { NOT: { serviceName: { contains: 'neco', mode: 'insensitive' } } }
                ];
            } else if (type === 'nin_slip') {
                where.AND = [
                    { type: 'professional' },
                    { serviceName: { contains: 'nin', mode: 'insensitive' } }
                ];
            } else if (type === 'bvn_slip') {
                where.AND = [
                    { type: 'professional' },
                    { serviceName: { contains: 'bvn', mode: 'insensitive' } }
                ];
            } else {
                where.type = type;
            }
        }

        if (status && status !== 'all') {
            where.status = parseInt(status);
        }

        // [SEC-MED-06] Validate date filter inputs
        if (startDate) {
            const parsedStart = new Date(startDate);
            if (isNaN(parsedStart.getTime())) {
                return res.status(400).json({ error: 'Invalid startDate format' });
            }
            where.date = { ...where.date, gte: parsedStart };
        }
        if (endDate) {
            const parsedEnd = new Date(endDate);
            if (isNaN(parsedEnd.getTime())) {
                return res.status(400).json({ error: 'Invalid endDate format' });
            }
            // Include entire day for endDate
            parsedEnd.setHours(23, 59, 59, 999);
            where.date = { ...where.date, lte: parsedEnd };
        }

        if (search) {
            const searchConditions = [
                { reference: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { serviceName: { contains: search, mode: 'insensitive' } }
            ];
            // Merge search into existing AND if present, or just set OR
            if (where.AND) {
                where.AND.push({ OR: searchConditions });
            } else if (where.OR) {
                // Already have an OR for type filter — wrap everything in AND
                const existingOR = where.OR;
                delete where.OR;
                where.AND = [{ OR: existingOR }, { OR: searchConditions }];
            } else {
                where.OR = searchConditions;
            }
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                take: rawLimit,
                skip: rawOffset
            }),
            prisma.transaction.count({ where })
        ]);

        // Add slipUrl if it exists for professional transactions
        const transactionsWithSlips = await Promise.all(transactions.map(async (tx) => {
            if (tx.type === 'professional') {
                const ninReport = await prisma.ninReport.findUnique({
                    where: { transactionRef: tx.reference },
                    select: { pdfUrl: true }
                });
                if (ninReport?.pdfUrl) return { ...tx, slipUrl: ninReport.pdfUrl };

                const bvnReport = await prisma.bvnReport.findUnique({
                    where: { transactionRef: tx.reference },
                    select: { pdfUrl: true }
                });
                if (bvnReport?.pdfUrl) return { ...tx, slipUrl: bvnReport.pdfUrl };
            }
            return tx;
        }));

        res.json({
            transactions: transactionsWithSlips,
            pagination: {
                total,
                limit: rawLimit,
                offset: rawOffset
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single transaction
router.get('/transactions/:reference', authenticateUser, async (req, res) => {
    try {
        const transaction = await prisma.transaction.findFirst({
            where: {
                reference: req.params.reference,
                userId: req.user.id
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Add slipUrl if it's a professional transaction
        let slipUrl = null;
        if (transaction.type === 'professional') {
            const ninReport = await prisma.ninReport.findUnique({
                where: { transactionRef: transaction.reference },
                select: { pdfUrl: true }
            });
            if (ninReport?.pdfUrl) {
                slipUrl = ninReport.pdfUrl;
            } else {
                const bvnReport = await prisma.bvnReport.findUnique({
                    where: { transactionRef: transaction.reference },
                    select: { pdfUrl: true }
                });
                if (bvnReport?.pdfUrl) slipUrl = bvnReport.pdfUrl;
            }
        }

        res.json({
            transaction: { ...transaction, slipUrl }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
