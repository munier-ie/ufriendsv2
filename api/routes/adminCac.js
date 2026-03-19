const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { creditReferralBonus } = require('../services/referral.service');
const { z } = require('zod');

// Schema for updating registration status
const updateRegistrationSchema = z.object({
    status: z.number().int().min(1).max(2), // 1=Approved, 2=Rejected
    adminNotes: z.string().max(1000).optional()
});

// Schema for updating settings
const updateSettingsSchema = z.object({
    charge: z.number().positive('Business Name User price must be positive'),
    chargeAgent: z.number().positive('Business Name Agent price must be positive'),
    chargeVendor: z.number().positive('Business Name Vendor price must be positive'),
    chargeBase: z.number().positive('Business Name Base price must be positive'),
    charge2: z.number().positive('Limited Liability User price must be positive'),
    charge2Agent: z.number().positive('Limited Liability Agent price must be positive'),
    charge2Vendor: z.number().positive('Limited Liability Vendor price must be positive'),
    charge2Base: z.number().positive('Limited Liability Base price must be positive'),
    referralCommission: z.number().nonnegative().optional().default(0),
    active: z.boolean()
});

// GET /api/admin/cac/requests - List all registrations
router.get('/requests', adminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20, search } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (status !== undefined) {
            where.status = parseInt(status);
        }
        if (search) {
            where.OR = [
                { businessName: { contains: search, mode: 'insensitive' } },
                { altBusinessName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { user: { username: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [registrations, total] = await Promise.all([
            prisma.cACRegistration.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            email: true, phone: true
                        }
                    },
                    admin: {
                        select: { username: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit)
            }),
            prisma.cACRegistration.count({ where })
        ]);

        res.json({
            success: true,
            registrations,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Fetch CAC requests error:', error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

// PUT /api/admin/cac/requests/:id - Process registration
router.put('/requests/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = updateRegistrationSchema.parse(req.body);
        const adminId = req.admin.id;

        const registration = await prisma.cACRegistration.findUnique({
            where: { id: parseInt(id) },
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        const updated = await prisma.cACRegistration.update({
            where: { id: parseInt(id) },
            data: {
                status,
                adminId,
                adminNotes: adminNotes || null,
                processedAt: new Date()
            }
        });

        // If approved and was previously pending, credit referral bonus
        if (status === 1 && registration.status === 0) {
            const settings = await prisma.cACSettings.findFirst();
            if (settings && settings.referralCommission > 0) {
                creditReferralBonus(registration.userId, 'CAC', settings.referralCommission)
                    .catch(err => console.error('Admin CAC Bonus error:', err));
            }
        }

        res.json({ success: true, message: `Registration ${status === 1 ? 'approved' : 'rejected'} successfully`, registration: updated });
    } catch (error) {
        console.error('Process CAC request error:', error);
        res.status(400).json({ error: error.message || 'Failed to process request' });
    }
});

// GET /api/admin/cac/settings - Get configuration
router.get('/settings', adminAuth, async (req, res) => {
    try {
        let settings = await prisma.cACSettings.findFirst();

        if (!settings) {
            settings = await prisma.cACSettings.create({
                data: {
                    charge: 5000,
                    charge2: 15000,
                    active: true,
                    updatedAt: new Date()
                }
            });
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Fetch CAC settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT /api/admin/cac/settings - Update settings
router.put('/settings', adminAuth, async (req, res) => {
    try {
        const data = updateSettingsSchema.parse({
            charge: parseFloat(req.body.charge),
            chargeAgent: parseFloat(req.body.chargeAgent),
            chargeVendor: parseFloat(req.body.chargeVendor),
            chargeBase: parseFloat(req.body.chargeBase),
            charge2: parseFloat(req.body.charge2),
            charge2Agent: parseFloat(req.body.charge2Agent),
            charge2Vendor: parseFloat(req.body.charge2Vendor),
            charge2Base: parseFloat(req.body.charge2Base),
            referralCommission: parseFloat(req.body.referralCommission || 0),
            active: req.body.active
        });

        const existing = await prisma.cACSettings.findFirst();

        if (existing) {
            await prisma.cACSettings.update({
                where: { id: existing.id },
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            });
        } else {
            await prisma.cACSettings.create({
                data: {
                    ...data,
                    updatedAt: new Date()
                }
            });
        }

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update CAC settings error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: error.errors[0]?.message || 'Validation failed' });
        }
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;

