/**
 * /api/v1/wallet
 * External API – Wallet & Transactions
 *
 * Auth: API Key (Bearer <apiKey>) via apiKeyAuth middleware
 * Access: Vendor accounts only (user.type === 3)
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../../prisma/client');
const { apiKeyAuth, logApiResponse } = require('../../middleware/apiKeySecurity');

router.use(logApiResponse);

// ─── GET /api/v1/wallet/balance ──────────────────────────────────────────────
/**
 * @api {get} /api/v1/wallet/balance Get Wallet Balance
 * Returns the current wallet balance, referral wallet, and virtual account details.
 */
router.get('/balance', apiKeyAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                wallet:             true,
                refWallet:          true,
                bankName:           true,
                bankNo:             true,
                firstName:          true,
                lastName:           true,
                virtualAccountName: true
            }
        });

        res.json({
            success:    true,
            wallet:     user.wallet,
            refWallet:  user.refWallet,
            total:      user.wallet + user.refWallet,
            virtualAccount: {
                bankName:      user.bankName,
                accountNumber: user.bankNo,
                accountName:   user.virtualAccountName || `${user.firstName} ${user.lastName}`.toUpperCase()
            }
        });
    } catch (error) {
        console.error('[v1/wallet balance] Error:', error);
        res.status(500).json({ status: 1, message: 'Internal server error' });
    }
});

// ─── GET /api/v1/wallet/transactions ────────────────────────────────────────
/**
 * @api {get} /api/v1/wallet/transactions List Transactions
 * @apiQuery {Number} [limit=50]       Max records (capped at 100)
 * @apiQuery {Number} [offset=0]       Pagination offset
 * @apiQuery {String} [type]           Service type filter
 * @apiQuery {Number} [status]         0=success, 1=failed, 2=pending
 * @apiQuery {String} [startDate]      ISO date string
 * @apiQuery {String} [endDate]        ISO date string
 * @apiQuery {String} [search]         Search by reference or description
 */
router.get('/transactions', apiKeyAuth, async (req, res) => {
    try {
        const rawLimit  = Math.min(parseInt(req.query.limit)  || 50,  100);
        const rawOffset = Math.max(parseInt(req.query.offset) || 0,   0);
        const { type, status, search, startDate, endDate } = req.query;

        const where = { userId: req.user.id };

        if (type && type !== 'all') where.type = type;

        if (status && status !== 'all') {
            const parsedStatus = parseInt(status);
            if (!isNaN(parsedStatus)) where.status = parsedStatus;
        }

        if (startDate) {
            const d = new Date(startDate);
            if (isNaN(d.getTime())) return res.status(400).json({ status: 1, message: 'Invalid startDate' });
            where.date = { ...where.date, gte: d };
        }

        if (endDate) {
            const d = new Date(endDate);
            if (isNaN(d.getTime())) return res.status(400).json({ status: 1, message: 'Invalid endDate' });
            d.setHours(23, 59, 59, 999);
            where.date = { ...where.date, lte: d };
        }

        if (search) {
            where.OR = [
                { reference:   { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { serviceName: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                take:    rawLimit,
                skip:    rawOffset,
                select: {
                    reference:   true,
                    serviceName: true,
                    description: true,
                    amount:      true,
                    status:      true,
                    type:        true,
                    oldBalance:  true,
                    newBalance:  true,
                    date:        true,
                    createdAt:   true
                }
            }),
            prisma.transaction.count({ where })
        ]);

        res.json({
            success: true,
            transactions,
            pagination: { total, limit: rawLimit, offset: rawOffset }
        });
    } catch (error) {
        console.error('[v1/wallet transactions] Error:', error);
        res.status(500).json({ status: 1, message: 'Internal server error' });
    }
});

// ─── GET /api/v1/wallet/transactions/:reference ──────────────────────────────
/**
 * @api {get} /api/v1/wallet/transactions/:reference Get Single Transaction
 */
router.get('/transactions/:reference', apiKeyAuth, async (req, res) => {
    try {
        const transaction = await prisma.transaction.findFirst({
            where: {
                reference: req.params.reference,
                userId:    req.user.id
            }
        });

        if (!transaction) {
            return res.status(404).json({ status: 1, message: 'Transaction not found' });
        }

        res.json({ success: true, transaction });
    } catch (error) {
        console.error('[v1/wallet transaction/:ref] Error:', error);
        res.status(500).json({ status: 1, message: 'Internal server error' });
    }
});

module.exports = router;
