const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const pinRateLimit = require('../middleware/pinRateLimit');
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { creditReferralBonus } = require('../services/referral.service');
const whatsappService = require('../services/whatsapp.service');

// ID Upload directory
const idUploadDir = path.join(__dirname, '../uploads/manual-ids');
if (!fs.existsSync(idUploadDir)) fs.mkdirSync(idUploadDir, { recursive: true });

const idStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, idUploadDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        cb(null, `id-${unique}${path.extname(file.originalname)}`);
    }
});

const idUpload = multer({
    storage: idStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const ok = /jpeg|jpg|png|webp|pdf/.test(
            path.extname(file.originalname).toLowerCase().replace('.', '')
        );
        if (ok) return cb(null, true);
        cb(new Error('Only image (JPEG, PNG, WEBP) or PDF files allowed'));
    }
});

// ============================================================
// POST /api/manual-services/upload-id
// ============================================================
router.post('/upload-id', authenticateUser, idUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const filePath = `/api/uploads/manual-ids/${req.file.filename}`;
        res.json({ success: true, filePath });
    } catch (err) {
        console.error('ID upload error:', err);
        res.status(500).json({ error: 'Failed to upload identification document' });
    }
});

// ============================================================
// Helper: verify transaction PIN
// ============================================================
async function verifyTransactionPin(user, pin) {
    if (user.transactionPin) {
        const bcrypt = require('bcryptjs');
        return bcrypt.compare(pin, user.transactionPin);
    }
    if (user.pin) return user.pin === pin;
    return null;
}

// ============================================================
// Helper: get or create settings
// ============================================================
async function getSettings() {
    let settings = await prisma.manualServiceSettings.findFirst();
    if (!settings) {
        settings = await prisma.manualServiceSettings.create({ data: {} });
    }
    return settings;
}

// Helper: pick price by serviceType, subType and userType
async function resolvePrice(user, serviceType, subType) {
    const priceRecord = await prisma.manualServicePrice.findUnique({
        where: {
            serviceType_subType: {
                serviceType,
                subType: subType || ''
            }
        }
    });

    const getPriceObj = (record) => {
        let sellingPrice = record.userPrice;
        if (user.type === 2) sellingPrice = record.agentPrice;
        if (user.type === 3) sellingPrice = record.vendorPrice;
        return { sellingPrice, costPrice: record.basePrice };
    };

    if (!priceRecord) {
        const baseRecord = await prisma.manualServicePrice.findUnique({
            where: {
                serviceType_subType: {
                    serviceType,
                    subType: ''
                }
            }
        });
        if (!baseRecord) return { sellingPrice: 0, costPrice: 0 };
        return getPriceObj(baseRecord);
    }

    return getPriceObj(priceRecord);
}

// Helper: pick active flag
function resolveActive(settings, serviceType) {
    const map = {
        BVN_MODIFICATION: settings.bvnModificationActive,
        BVN_RETRIEVAL: settings.bvnRetrievalActive,
        VNIN_NIBSS: settings.vninNibssActive,
        BVN_ANDROID: settings.bvnAndroidActive,
        NIN_MODIFICATION: settings.ninModificationActive,
        NIN_VALIDATION: settings.ninValidationActive,
    };
    return map[serviceType] ?? false;
}

const SERVICE_LABELS = {
    BVN_MODIFICATION: 'BVN Modification',
    BVN_RETRIEVAL: 'BVN Retrieval',
    VNIN_NIBSS: 'VNIN Forward to NIBSS',
    BVN_ANDROID: 'BVN Android License',
    NIN_MODIFICATION: 'NIN Modification',
    NIN_VALIDATION: 'NIN Validation',
};

const VALID_TYPES = Object.keys(SERVICE_LABELS);

// ============================================================
// GET /api/manual-services/pricing
// ============================================================
router.get('/pricing', authenticateUser, async (req, res) => {
    try {
        const settings = await prisma.manualServiceSettings.findFirst();
        const allPrices = await prisma.manualServicePrice.findMany({
            where: { active: true }
        });

        // Filter prices based on user type for frontend ease
        const userTypePrices = allPrices.map(p => ({
            serviceType: p.serviceType,
            subType: p.subType,
            price: req.user.type === 2 ? p.agentPrice : (req.user.type === 3 ? p.vendorPrice : p.userPrice)
        }));

        res.json({
            success: true,
            settings,
            prices: userTypePrices
        });
    } catch (err) {
        console.error('Manual services pricing error:', err);
        res.status(500).json({ error: 'Failed to fetch pricing' });
    }
});

// ============================================================
// POST /api/manual-services/submit
// ============================================================
router.post('/submit', authenticateUser, pinRateLimit, async (req, res) => {
    try {
        const { serviceType, subType, details, pin } = req.body;

        // 1. Validate service type
        if (!VALID_TYPES.includes(serviceType)) {
            return res.status(400).json({ error: 'Invalid service type' });
        }

        // 2. Get settings
        const settings = await getSettings();

        // 3. Check service is active
        if (!resolveActive(settings, serviceType)) {
            return res.status(503).json({ error: `${SERVICE_LABELS[serviceType]} is currently unavailable` });
        }

        // 4. Verify PIN
        const pinOk = await verifyTransactionPin(req.user, pin);
        if (pinOk === null) return res.status(400).json({ error: 'No transaction PIN set.' });
        if (!pinOk) {
            if (req._recordPinFailure) req._recordPinFailure();
            return res.status(400).json({ error: 'Invalid transaction PIN' });
        }
        pinRateLimit.onSuccess(req.user.id);

        // 5. Resolve price
        const { sellingPrice: amount, costPrice } = await resolvePrice(req.user, serviceType, subType);
        const profit = amount - costPrice;

        // 6. Check balance
        if (req.user.wallet < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        const transRef = `MS-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
        const safeDetails = JSON.stringify(details || {});
        const label = SERVICE_LABELS[serviceType];

        // Extract top-level fields for queryable columns
        const phone = details?.phoneNumber || null;
        const email = details?.email || null;
        const dateOfBirth = details?.dateOfBirth || null;

        // 7. Atomic DB transaction
        const result = await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: req.user.id },
                data: { wallet: { decrement: amount } }
            });

            const request = await tx.manualServiceRequest.create({
                data: {
                    userId: req.user.id,
                    serviceType,
                    subType: subType || null,
                    details: safeDetails,
                    amount,
                    status: 0,
                    transRef,
                    phone,
                    email,
                    dateOfBirth
                }
            });

            await tx.transaction.create({
                data: {
                    reference: transRef,
                    serviceName: label,
                    description: `${label}${subType ? ' - ' + subType.replace(/_/g, ' ') : ''}`,
                    amount: -amount,
                    status: 0,
                    oldBalance: req.user.wallet,
                    newBalance: req.user.wallet - amount,
                    profit: profit > 0 ? profit : 0,
                    userId: req.user.id,
                    type: 'professional'
                }
            });

            return request;
        });

        // Referral bonus will be credited upon admin approval

        // 8. For BVN_RETRIEVAL — auto-attempt Prembly
        if (serviceType === 'BVN_RETRIEVAL') {
            try {
                const verSettings = await prisma.verificationSettings.findFirst();
                if (verSettings?.apiKey && details?.phoneNumber) {
                    const premblyRes = await axios.post(
                        'https://api.prembly.com/identitypass/verification/bvn_with_phone',
                        { phone_number: details.phoneNumber },
                        {
                            headers: {
                                'x-api-key': verSettings.apiKey,
                                ...(verSettings.appId ? { 'app-id': verSettings.appId } : {}),
                                'Content-Type': 'application/json',
                                'accept': 'application/json'
                            },
                            timeout: 15000
                        }
                    );
                    // If Prembly succeeds, auto-complete the request
                    if (premblyRes.data?.status === true || premblyRes.data?.response_code === '00') {
                        const bvnData = premblyRes.data?.data ?? premblyRes.data;
                        const bvn = bvnData?.bvn || bvnData?.bvnNumber || '';
                        if (bvn) {
                            await prisma.manualServiceRequest.update({
                                where: { id: result.id },
                                data: {
                                    status: 1,
                                    adminNote: `Auto-completed via Prembly. BVN: ${bvn}`,
                                    proofUrl: null,
                                    processedAt: new Date()
                                }
                            });

                            return res.json({
                                success: true,
                                message: 'BVN retrieved successfully.',
                                bvn,
                                requestId: result.id,
                                transRef
                            });
                        }
                    }
                }
            } catch (premblyErr) {
                // Non-fatal — fall through to manual admin processing
                console.warn('Prembly BVN retrieval failed, routing to admin:', premblyErr.message);
            }
        }

        res.json({
            success: true,
            message: 'Request submitted successfully. An admin will process it and upload proof.',
            requestId: result.id,
            transRef
        });

        // 9. Send Notification to Admin
        const { sendAdminServiceRequestNotification } = require('../services/email.service');
        let detailsHtml = '<ul style="list-style: none; padding: 0;">';
        if (details) {
            for (const [key, value] of Object.entries(details)) {

                // Format file links nicely
                let displayValue = value;
                if (typeof value === 'string' && value.includes('/uploads/')) {
                    const fullUrl = `${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}${value}`;
                    displayValue = `<br><a href="${fullUrl}" target="_blank" style="display:inline-block; margin-top:5px; padding:8px 15px; background:#e9ecef; color:#333; text-decoration:none; border-radius:4px; font-size:12px;">View Document</a>`;
                }

                // Format keys (camelCase to Title Case)
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                detailsHtml += `<li style="margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px;"><strong>${formattedKey}:</strong> <span style="color: #444;">${displayValue}</span></li>`;
            }
        }
        detailsHtml += '</ul>';

        sendAdminServiceRequestNotification(req.user, label, amount, transRef, detailsHtml)
            .catch(err => console.error('Failed to send admin notification email:', err));

        // 10. Send Notification to Admin via WhatsApp
        whatsappService.notifyAdminNewRequest(req.user, label, amount, transRef)
            .catch(err => console.error('Failed to send admin notification whatsapp:', err));

    } catch (err) {
        console.error('Manual services submit error:', err);
        res.status(500).json({ error: 'Failed to submit request' });
    }
});

// ============================================================
// GET /api/manual-services/history
// ============================================================
router.get('/history', authenticateUser, async (req, res) => {
    try {
        const requests = await prisma.manualServiceRequest.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json({ success: true, requests });
    } catch (err) {
        console.error('Manual services history error:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ============================================================
// GET /api/manual-services/:id/proof
// ============================================================
router.get('/:id/proof', authenticateUser, async (req, res) => {
    try {
        const request = await prisma.manualServiceRequest.findFirst({
            where: { id: parseInt(req.params.id), userId: req.user.id }
        });
        if (!request) return res.status(404).json({ error: 'Request not found' });
        res.json({ success: true, proofUrl: request.proofUrl, status: request.status, adminNote: request.adminNote });
    } catch (err) {
        console.error('Manual services proof error:', err);
        res.status(500).json({ error: 'Failed to fetch proof' });
    }
});

// ============================================================
// GET /api/manual-services/:id - View single request details (no amount)
// ============================================================
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const request = await prisma.manualServiceRequest.findFirst({
            where: { id: parseInt(req.params.id), userId: req.user.id }
        });
        if (!request) return res.status(404).json({ error: 'Request not found' });

        // Return all fields except amount (user should not see charges)
        const { amount: _amount, ...safeRequest } = request;
        let parsedDetails = {};
        try { parsedDetails = JSON.parse(request.details || '{}'); } catch {}

        const STATUS_LABELS = { 0: 'Pending', 1: 'Approved', 2: 'Rejected', 3: 'In Progress' };

        res.json({
            success: true,
            request: {
                ...safeRequest,
                details: parsedDetails,
                statusLabel: STATUS_LABELS[request.status] || 'Unknown'
            }
        });
    } catch (err) {
        console.error('Manual services view error:', err);
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});

module.exports = router;

