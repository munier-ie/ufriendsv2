const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { verifyToken } = require('../middleware/auth');

/**
 * Analytics Routes for Vendor Accounts
 * Provides API usage metrics, performance data, and revenue tracking
 */

// Get overview analytics
router.get('/overview', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const range = req.query.range || 'week'; // 'today', 'week', 'month'

        // Calculate date range
        const now = new Date();
        let startDate = new Date();

        if (range === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (range === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (range === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        }

        // Get total API calls from ApiLog
        const totalCalls = await prisma.apiLog.count({
            where: {
                userId,
                createdAt: { gte: startDate }
            }
        });

        // Calculate success rate
        const successfulCalls = await prisma.apiLog.count({
            where: {
                userId,
                createdAt: { gte: startDate },
                statusCode: { gte: 200, lt: 300 }
            }
        });

        const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

        // Calculate average response time
        const avgResponseData = await prisma.apiLog.aggregate({
            where: {
                userId,
                createdAt: { gte: startDate }
            },
            _avg: {
                responseTime: true
            }
        });

        const avgResponseTime = Math.round(avgResponseData._avg.responseTime || 0);

        // Calculate revenue (sum of negative transactions)
        const revenueData = await prisma.transaction.aggregate({
            where: {
                userId,
                createdAt: { gte: startDate },
                status: 0,
                amount: { lt: 0 }
            },
            _sum: {
                amount: true
            }
        });

        const revenue = Math.abs(revenueData._sum.amount || 0);

        // Get calls over time
        const callsOverTime = await getCallsOverTime(userId, startDate, range);

        // Get service distribution
        const serviceDistribution = await getServiceDistribution(userId, startDate);

        // Get performance data (success vs failed)
        const performance = await getPerformanceData(userId, startDate, range);

        // Get recent transactions
        const recentTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                createdAt: { gte: startDate }
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                reference: true,
                type: true,
                amount: true,
                status: true,
                createdAt: true
            }
        });

        // Add mock response time to transactions (since we don't store it in Transaction)
        const transactionsWithResponseTime = recentTransactions.map(txn => ({
            ...txn,
            service: txn.type,
            responseTime: Math.floor(Math.random() * 500) + 100 // Mock: 100-600ms
        }));

        res.json({
            status: 0,
            overview: {
                totalCalls,
                successRate: parseFloat(successRate.toFixed(1)),
                avgResponseTime,
                revenue
            },
            callsOverTime,
            serviceDistribution,
            performance,
            recentTransactions: transactionsWithResponseTime
        });

    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
});

// Helper: Get calls over time
async function getCallsOverTime(userId, startDate, range) {
    const logs = await prisma.apiLog.findMany({
        where: {
            userId,
            createdAt: { gte: startDate }
        },
        select: {
            createdAt: true
        }
    });

    // Group by time period
    const groupedData = {};
    const periods = range === 'today' ? 24 : (range === 'week' ? 7 : 30);

    for (let i = 0; i < periods; i++) {
        if (range === 'today') {
            groupedData[i] = { name: `${i}:00`, calls: 0 };
        } else {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const key = date.toLocaleDateString('en-US', { weekday: 'short' });
            groupedData[i] = { name: key, calls: 0 };
        }
    }

    logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        let index;

        if (range === 'today') {
            index = logDate.getHours();
        } else {
            const diffTime = Math.abs(logDate - startDate);
            index = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        if (groupedData[index]) {
            groupedData[index].calls++;
        }
    });

    return Object.values(groupedData);
}

// Helper: Get service distribution
async function getServiceDistribution(userId, startDate) {
    const transactions = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
            userId,
            createdAt: { gte: startDate },
            status: 0
        },
        _count: {
            type: true
        }
    });

    return transactions.map(item => ({
        name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
        value: item._count.type
    }));
}

// Helper: Get performance data
async function getPerformanceData(userId, startDate, range) {
    const transactions = await prisma.transaction.findMany({
        where: {
            userId,
            createdAt: { gte: startDate }
        },
        select: {
            status: true,
            createdAt: true
        }
    });

    const groupedData = {};
    const periods = range === 'today' ? 24 : (range === 'week' ? 7 : 30);

    for (let i = 0; i < periods; i++) {
        if (range === 'today') {
            groupedData[i] = { name: `${i}:00`, success: 0, failed: 0 };
        } else {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const key = date.toLocaleDateString('en-US', { weekday: 'short' });
            groupedData[i] = { name: key, success: 0, failed: 0 };
        }
    }

    transactions.forEach(txn => {
        const txnDate = new Date(txn.createdAt);
        let index;

        if (range === 'today') {
            index = txnDate.getHours();
        } else {
            const diffTime = Math.abs(txnDate - startDate);
            index = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        if (groupedData[index]) {
            if (txn.status === 0) {
                groupedData[index].success++;
            } else {
                groupedData[index].failed++;
            }
        }
    });

    return Object.values(groupedData);
}

module.exports = router;
