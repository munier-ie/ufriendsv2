const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const auth = require('../middleware/auth');
const ninService = require('../services/nin.service');

/**
 * POST /api/nin/verify - Initiate NIN verification (called from professional.js)
 * This is an internal route called after wallet deduction
 */
router.post('/verify', auth, async (req, res) => {
    try {
        const { ninNumber, slipType, transactionRef } = req.body;
        const userId = req.user.id;
        const userType = req.user.type || 1;

        if (!ninNumber || !slipType || !transactionRef) {
            return res.status(400).json({
                error: 'NIN number, slip type, and transaction reference are required'
            });
        }

        // Validate slip type
        if (!['regular', 'standard', 'premium', 'vnin'].includes(slipType)) {
            return res.status(400).json({ error: 'Invalid slip type' });
        }

        // Process NIN verification
        const result = await ninService.processNinVerification(
            userId,
            ninNumber,
            slipType,
            transactionRef,
            userType
        );

        if (result.success) {
            const report = result.report ? {
                ...result.report,
                pdfUrl: result.report.id ? `/api/slips/nin/${result.report.id}/download` : result.report.pdfUrl
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
        console.error('NIN Verification Route Error:', error);
        res.status(500).json({ error: 'Failed to process NIN verification' });
    }
});

/**
 * GET /api/nin/reports - Get user's NIN reports
 * Returns download URL pointing to our authenticated proxy endpoint (/api/slips/nin/:id/download)
 */
router.get('/reports', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [reports, total] = await Promise.all([
            prisma.ninReport.findMany({
                where: { userId },
                select: {
                    id: true,
                    transactionRef: true,
                    ninNumber: true,
                    slipType: true,
                    firstName: true,
                    middleName: true,
                    surname: true,
                    dateOfBirth: true,
                    pdfUrl: true,
                    status: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit)
            }),
            prisma.ninReport.count({ where: { userId } })
        ]);

        // Point pdfUrl to the authenticated download endpoint
        const reportsWithUrls = reports.map((report) => ({
            ...report,
            reportId: report.id,
            pdfUrl: report.pdfUrl ? `/api/slips/nin/${report.id}/download` : null
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
        console.error('Get NIN Reports Error:', error);
        res.status(500).json({ error: 'Failed to fetch NIN reports' });
    }
});

/**
 * GET /api/nin/reports/:id - Get specific NIN report
 */
router.get('/reports/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const report = await prisma.ninReport.findFirst({
            where: {
                id: parseInt(id),
                userId
            }
        });

        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const pdfUrl = report.pdfUrl ? `/api/slips/nin/${report.id}/download` : null;

        res.json({ success: true, report: { ...report, pdfUrl } });

    } catch (error) {
        console.error('Get NIN Report Error:', error);
        res.status(500).json({ error: 'Failed to fetch NIN report' });
    }
});

/**
 * GET /api/nin/pricing - Get NIN slip pricing for all types
 */
router.get('/pricing', auth, async (req, res) => {
    try {
        const userType = req.user.type || 1;
        const settings = await ninService.getVerificationSettings();

        // Get pricing for all slip types
        const regularPricing = await ninService.getNinPricing('regular', userType);
        const standardPricing = await ninService.getNinPricing('standard', userType);
        const premiumPricing = await ninService.getNinPricing('premium', userType);
        const vninPricing = await ninService.getNinPricing('vnin', userType);

        res.json({
            success: true,
            regular: regularPricing.userPrice,
            standard: standardPricing.userPrice,
            premium: premiumPricing.userPrice,
            vnin: vninPricing.userPrice,
            active: settings.ninActive
        });

    } catch (error) {
        console.error('Get NIN Pricing Error:', error);
        res.status(500).json({ error: 'Failed to fetch pricing' });
    }
});

module.exports = router;
