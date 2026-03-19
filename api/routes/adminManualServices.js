const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { creditReferralBonus } = require('../services/referral.service');

// Proof upload dir
const proofDir = path.join(__dirname, '../uploads/manual-proof');
if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

const proofStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, proofDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    }
});
const proofUpload = multer({
    storage: proofStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        const ok = /jpeg|jpg|png|gif|webp|pdf/.test(
            path.extname(file.originalname).toLowerCase().replace('.', '')
        );
        if (ok) return cb(null, true);
        cb(new Error('Only image or PDF files allowed'));
    }
});

// ============================================================
// GET /api/admin/manual-services/settings
// ============================================================
router.get('/settings', adminAuth, async (_req, res) => {
    try {
        let s = await prisma.manualServiceSettings.findFirst();
        if (!s) s = await prisma.manualServiceSettings.create({ data: {} });
        res.json({ success: true, settings: s });
    } catch (err) {
        console.error('Admin manual settings GET error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// ============================================================
// PUT /api/admin/manual-services/settings
// ============================================================
router.put('/settings', adminAuth, async (req, res) => {
    try {
        const {
            bvnModificationPrice, bvnRetrievalPrice, vninNibssPrice, bvnAndroidPrice,
            ninModificationPrice, ninValidationPrice,
            bvnModificationActive, bvnRetrievalActive, vninNibssActive, bvnAndroidActive,
            ninModificationActive, ninValidationActive
        } = req.body;

        const existing = await prisma.manualServiceSettings.findFirst();

        const data = {
            ...(bvnModificationPrice !== undefined && { bvnModificationPrice: parseFloat(bvnModificationPrice) }),
            ...(bvnRetrievalPrice !== undefined && { bvnRetrievalPrice: parseFloat(bvnRetrievalPrice) }),
            ...(vninNibssPrice !== undefined && { vninNibssPrice: parseFloat(vninNibssPrice) }),
            ...(bvnAndroidPrice !== undefined && { bvnAndroidPrice: parseFloat(bvnAndroidPrice) }),
            ...(ninModificationPrice !== undefined && { ninModificationPrice: parseFloat(ninModificationPrice) }),
            ...(ninValidationPrice !== undefined && { ninValidationPrice: parseFloat(ninValidationPrice) }),
            ...(bvnModificationActive !== undefined && { bvnModificationActive: Boolean(bvnModificationActive) }),
            ...(bvnRetrievalActive !== undefined && { bvnRetrievalActive: Boolean(bvnRetrievalActive) }),
            ...(vninNibssActive !== undefined && { vninNibssActive: Boolean(vninNibssActive) }),
            ...(bvnAndroidActive !== undefined && { bvnAndroidActive: Boolean(bvnAndroidActive) }),
            ...(ninModificationActive !== undefined && { ninModificationActive: Boolean(ninModificationActive) }),
            ...(ninValidationActive !== undefined && { ninValidationActive: Boolean(ninValidationActive) }),
        };

        let settings;
        if (existing) {
            settings = await prisma.manualServiceSettings.update({ where: { id: existing.id }, data });
        } else {
            settings = await prisma.manualServiceSettings.create({ data });
        }

        res.json({ success: true, message: 'Settings updated', settings });
    } catch (err) {
        console.error('Admin manual settings PUT error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ============================================================
// GET /api/admin/manual-services/prices
// ============================================================
router.get('/prices', adminAuth, async (_req, res) => {
    try {
        const prices = await prisma.manualServicePrice.findMany({
            orderBy: [
                { serviceType: 'asc' },
                { subType: 'asc' }
            ]
        });
        res.json({ success: true, prices });
    } catch (err) {
        console.error('Admin manual prices GET error:', err);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

// ============================================================
// PUT /api/admin/manual-services/prices/:id
// ============================================================
router.put('/prices/:id', adminAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { userPrice, agentPrice, vendorPrice, basePrice, active, referralCommission } = req.body;

        const updated = await prisma.manualServicePrice.update({
            where: { id },
            data: {
                ...(userPrice !== undefined && { userPrice: parseFloat(userPrice) }),
                ...(agentPrice !== undefined && { agentPrice: parseFloat(agentPrice) }),
                ...(vendorPrice !== undefined && { vendorPrice: parseFloat(vendorPrice) }),
                ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
                ...(active !== undefined && { active: Boolean(active) }),
                ...(referralCommission !== undefined && { referralCommission: parseFloat(referralCommission) })
            }
        });

        res.json({ success: true, message: 'Price updated', price: updated });
    } catch (err) {
        console.error('Admin manual prices PUT error:', err);
        res.status(500).json({ error: 'Failed to update price' });
    }
});

// ============================================================
// GET /api/admin/manual-services/requests
// ============================================================
router.get('/requests', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, serviceType, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (serviceType) where.serviceType = serviceType;
        if (status !== undefined && status !== '') where.status = parseInt(status);

        const [requests, total] = await Promise.all([
            prisma.manualServiceRequest.findMany({
                where,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.manualServiceRequest.count({ where })
        ]);

        res.json({
            success: true,
            requests,
            pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (err) {
        console.error('Admin manual requests GET error:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// ============================================================
// PUT /api/admin/manual-services/requests/:id
// Process (approve/reject) and optionally upload proof
// ============================================================
router.put('/requests/:id', adminAuth, proofUpload.single('proof'), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, adminNote, proofUrl: bodyProofUrl } = req.body;

        const request = await prisma.manualServiceRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ error: 'Request not found' });

        // Determine proof URL (uploaded file takes precedence over pasted URL)
        let finalProofUrl = bodyProofUrl || request.proofUrl || null;
        if (req.file) {
            finalProofUrl = `/api/uploads/manual-proof/${req.file.filename}`;
        }

        const updatedStatus = status !== undefined ? parseInt(status) : request.status;

        const updated = await prisma.manualServiceRequest.update({
            where: { id },
            data: {
                status: updatedStatus,
                adminNote: adminNote || request.adminNote,
                proofUrl: finalProofUrl,
                adminId: req.admin?.id || null,
                processedAt: updatedStatus !== 0 ? new Date() : request.processedAt
            }
        });

        // If rejected and was still pending, refund the user
        if (updatedStatus === 2 && request.status === 0) {
            await prisma.user.update({
                where: { id: request.userId },
                data: { wallet: { increment: request.amount } }
            });
        }

        // If approved and was previously pending, credit referral bonus
        if (updatedStatus === 1 && request.status === 0) {
            const priceRecord = await prisma.manualServicePrice.findUnique({
                where: {
                    serviceType_subType: {
                        serviceType: request.serviceType,
                        subType: request.subType || ''
                    }
                }
            });
            if (priceRecord && priceRecord.referralCommission > 0) {
                creditReferralBonus(request.userId, request.serviceType, priceRecord.referralCommission)
                    .catch(err => console.error('Admin MS Bonus error:', err));
            }
        }

        res.json({ success: true, message: 'Request updated', request: updated });
    } catch (err) {
        console.error('Admin manual request PUT error:', err);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

module.exports = router;
