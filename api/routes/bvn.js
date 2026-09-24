const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const auth = require('../middleware/auth');
const bvnService = require('../services/bvn.service');

/**
 * POST /api/bvn/verify - Initiate BVN verification (called from professional.js)
 * This is an internal route called after wallet deduction
 */
router.post('/verify', auth, async (req, res) => {
    try {
        const { bvnNumber, transactionRef } = req.body;
        const userId = req.user.id;
        const userType = req.user.type || 1;

        if (!bvnNumber || !transactionRef) {
            return res.status(400).json({ error: 'BVN number and transaction reference are required' });
        }

        // Process BVN verification
        const result = await bvnService.processBvnVerification(userId, bvnNumber, transactionRef, userType);

        if (result.success) {
            const report = result.report ? {
                ...result.report,
                pdfUrl: result.report.id ? `/api/slips/bvn/${result.report.id}/download` : result.report.pdfUrl
            } : null;

            res.json({
                success: true,
                message: result.message,
                report
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.message
            });
        }

    } catch (error) {
        console.error('BVN Verification Route Error:', error);
        res.status(500).json({ error: 'Failed to process BVN verification' });
    }
});

/**
 * GET /api/bvn/reports - Get user's BVN reports
 * Returns download URL pointing to our authenticated proxy endpoint (/api/slips/bvn/:id/download)
 */
router.get('/reports', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            prisma.bvnReport.findMany({
                where: { userId },
                select: {
                    id: true,
                    transactionRef: true,
                    bvnNumber: true,
                    firstName: true,
                    middleName: true,
                    lastName: true,
                    dateOfBirth: true,
                    pdfUrl: true,
                    status: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit)
            }),
            prisma.bvnReport.count({ where: { userId } })
        ]);

        // Point pdfUrl to the authenticated download endpoint
        const reportsWithUrls = reports.map((report) => ({
            ...report,
            reportId: report.id,
            pdfUrl: report.pdfUrl ? `/api/slips/bvn/${report.id}/download` : null
        }));

        res.json({
            success: true,
            reports: reportsWithUrls,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get BVN Reports Error:', error);
        res.status(500).json({ error: 'Failed to fetch BVN reports' });
    }
});

/**
 * GET /api/bvn/reports/:id - Get specific BVN report
 */
router.get('/reports/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const report = await prisma.bvnReport.findFirst({
            where: {
                id: parseInt(id),
                userId
            }
        });

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const pdfUrl = report.pdfUrl ? `/api/slips/bvn/${report.id}/download` : null;

        res.json({ success: true, report: { ...report, pdfUrl } });

    } catch (error) {
        console.error('Get BVN Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch BVN report' });
    }
});

/**
 * GET /api/bvn/pricing - Get BVN service pricing
 */
router.get('/pricing', auth, async (req, res) => {
    try {
        const userType = req.user.type || 1;
        const [regular, plastic] = await Promise.all([
            bvnService.getBvnPricing(userType, 'regular'),
            bvnService.getBvnPricing(userType, 'plastic')
        ]);

        res.json({
            success: true,
            regular: regular.userPrice,
            plastic: plastic.userPrice,
            active: regular.settings.active
        });

    } catch (error) {
        console.error('Get BVN Pricing Error:', error);
        res.status(500).json({ error: 'Failed to fetch pricing' });
    }
});

module.exports = router;
