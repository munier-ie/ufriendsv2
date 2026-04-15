const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');
const axios = require('axios');

// Schema for updating verification settings
const updateSettingsSchema = z.object({
    apiKey: z.string().optional(),
    appId: z.string().optional(),
    baseUrl: z.string().url().optional(),
    active: z.boolean().optional(),
    bvnUserPrice: z.number().nonnegative().optional(),
    bvnAgentPrice: z.number().nonnegative().optional(),
    bvnVendorPrice: z.number().nonnegative().optional(),
    bvnApiPrice: z.number().nonnegative().optional(),
    bvnReferralCommission: z.number().nonnegative().optional(),
    // BVN Plastic Slip
    bvnPlasticUserPrice: z.number().nonnegative().optional(),
    bvnPlasticAgentPrice: z.number().nonnegative().optional(),
    bvnPlasticVendorPrice: z.number().nonnegative().optional(),
    bvnPlasticApiPrice: z.number().nonnegative().optional(),
    // NIN Regular Slip
    ninRegularUserPrice: z.number().nonnegative().optional(),
    ninRegularAgentPrice: z.number().nonnegative().optional(),
    ninRegularVendorPrice: z.number().nonnegative().optional(),
    ninRegularApiPrice: z.number().nonnegative().optional(),
    ninRegularReferralCommission: z.number().nonnegative().optional(),
    // NIN Standard Slip
    ninStandardUserPrice: z.number().nonnegative().optional(),
    ninStandardAgentPrice: z.number().nonnegative().optional(),
    ninStandardVendorPrice: z.number().nonnegative().optional(),
    ninStandardApiPrice: z.number().nonnegative().optional(),
    ninStandardReferralCommission: z.number().nonnegative().optional(),
    // NIN Premium Slip
    ninPremiumUserPrice: z.number().nonnegative().optional(),
    ninPremiumAgentPrice: z.number().nonnegative().optional(),
    ninPremiumVendorPrice: z.number().nonnegative().optional(),
    ninPremiumApiPrice: z.number().nonnegative().optional(),
    ninPremiumReferralCommission: z.number().nonnegative().optional(),
    // NIN VNIN Slip
    ninVninUserPrice: z.number().nonnegative().optional(),
    ninVninAgentPrice: z.number().nonnegative().optional(),
    ninVninVendorPrice: z.number().nonnegative().optional(),
    ninVninApiPrice: z.number().nonnegative().optional(),
    ninVerificationAgentId: z.string().optional(),
    referralCommission: z.number().nonnegative().optional(),
    ninActive: z.boolean().optional()
});

/**
 * GET /api/admin/verification/settings - Get verification settings
 */
router.get('/settings', adminAuth, async (req, res) => {
    try {
        let settings = await prisma.verificationSettings.findFirst();

        // Create default settings if none exist
        if (!settings) {
            settings = await prisma.verificationSettings.create({
                data: {
                    bvnUserPrice: 500,
                    bvnAgentPrice: 450,
                    bvnVendorPrice: 400,
                    bvnApiPrice: 300,
                    ninRegularUserPrice: 150,
                    ninRegularAgentPrice: 140,
                    ninRegularVendorPrice: 130,
                    ninRegularApiPrice: 100,
                    active: false,
                    ninActive: true
                }
            });
        }

        res.json({ success: true, settings });

    } catch (error) {
        console.error('Get verification settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * PUT /api/admin/verification/settings - Update verification settings
 */
router.put('/settings', adminAuth, async (req, res) => {
    try {
        const validatedData = updateSettingsSchema.parse(req.body);

        const existing = await prisma.verificationSettings.findFirst();

        let settings;
        if (existing) {
            settings = await prisma.verificationSettings.update({
                where: { id: existing.id },
                data: validatedData
            });
        } else {
            settings = await prisma.verificationSettings.create({
                data: {
                    ...validatedData,
                    bvnUserPrice: validatedData.bvnUserPrice ?? 500,
                    bvnAgentPrice: validatedData.bvnAgentPrice ?? 450,
                    bvnVendorPrice: validatedData.bvnVendorPrice ?? 400,
                    bvnApiPrice: validatedData.bvnApiPrice ?? 300,
                    ninRegularUserPrice: validatedData.ninRegularUserPrice ?? 150,
                    ninRegularAgentPrice: validatedData.ninRegularAgentPrice ?? 140,
                    ninRegularVendorPrice: validatedData.ninRegularVendorPrice ?? 130,
                    ninRegularApiPrice: validatedData.ninRegularApiPrice ?? 100
                }
            });
        }

        res.json({ success: true, message: 'Settings updated successfully', settings });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Update verification settings error:', error);
        if (error.code) console.error('Prisma Error Code:', error.code);
        if (error.meta) console.error('Prisma Error Meta:', error.meta);
        res.status(500).json({ error: 'Failed to update settings', details: error.message });
    }
});

/**
 * POST /api/admin/verification/test-connection - Test Prembly API connection
 */
router.post('/test-connection', adminAuth, async (req, res) => {
    try {
        const { apiKey, appId, baseUrl } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API Key is required for testing' });
        }

        // Test with a dummy NIN (this will fail but we can check if API is reachable)
        const base = (baseUrl || 'https://api.prembly.com').replace(/\/$/, '');
        const endpoint = base.includes('verification') ? '/vnin' : '/verification/vnin';
        const testUrl = `${base}${endpoint}`;

        const headers = {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        };

        if (appId) {
            headers['app-id'] = appId;
        }

        try {
            console.log('Test Connection Request:');
            console.log('URL:', testUrl);
            console.log('Payload:', { number_nin: '12345678901' });

            const response = await axios.post(
                testUrl,
                {
                    number_nin: '12345678901', // Test NIN
                },
                {
                    headers,
                    timeout: 10000,
                    validateStatus: () => true // Accept any status code
                }
            );

            // Check if we got a response (even if it's an error, it means API is reachable)
            if (response.status === 401 || response.status === 403) {
                return res.status(401).json({
                    error: 'Authentication failed. Please check your API Key and App ID.'
                });
            }

            if (response.status >= 200 && response.status < 500) {
                return res.json({
                    success: true,
                    message: 'Connection successful! API credentials are valid.'
                });
            }

            return res.status(500).json({
                error: 'API returned an unexpected error. Please check your configuration.'
            });

        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                return res.status(503).json({
                    error: 'Cannot reach Prembly API. Please check the Base URL.'
                });
            }

            throw error;
        }

    } catch (error) {
        console.error('Test connection error:', error);
        res.status(500).json({
            error: error.message || 'Failed to test connection'
        });
    }
});

/**
 * GET /api/admin/verification/reports - Get all BVN reports (admin view)
 */
router.get('/reports', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { bvnNumber: { contains: search } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { transactionRef: { contains: search } }
            ];
        }

        const [reports, total] = await Promise.all([
            prisma.bvnReport.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, phone: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit)
            }),
            prisma.bvnReport.count({ where })
        ]);

        res.json({
            success: true,
            reports,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get admin BVN reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

module.exports = router;
