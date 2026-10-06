const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const bvnService = require('../services/bvn.service');
const ninService = require('../services/nin.service');
const { creditReferralBonus } = require('../services/referral.service');
const whatsappService = require('../services/whatsapp.service');
const walletOps = require('../services/wallet.service');


// --- Multer config for CAC file uploads ---
const cacUploadDir = path.join(__dirname, '../uploads/cac');
if (!fs.existsSync(cacUploadDir)) {
    fs.mkdirSync(cacUploadDir, { recursive: true });
}

const cacStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, cacUploadDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    }
});

const cacUpload = multer({
    storage: cacStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
        const mimeOk = allowed.test(file.mimetype.split('/')[1]);
        if (extOk && mimeOk) return cb(null, true);
        cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    }
});

// --- Zod schema for CAC submission ---
const cacDetailsSchema = z.object({
    businessName: z.string().min(2, 'Business name is required').max(200),
    altBusinessName: z.string().min(2, 'Alternate business name is required').max(200),
    businessType: z.enum(['biz', 'limited', 'enterprise', 'ngo'], { message: 'Invalid business type' }),
    companyAddress: z.string().min(5, 'Company address is required').max(500),
    residentialAddress: z.string().min(5, 'Residential address is required').max(500),
    natureOfBusiness: z.string().min(2, 'Nature of business is required').max(300),
    shareCapital: z.string().max(100).optional().default(''),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15)
        .regex(/^[0-9+]+$/, 'Phone must contain only digits'),
    pin: z.string().length(4, 'PIN must be 4 digits')
});

// --- Verify transaction PIN helper ---
async function verifyTransactionPin(user, pin) {
    if (!user.transactionPin) return null; // no pin set
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(pin, user.transactionPin);
}

const { cache } = require('../middleware/cacheMiddleware');

// ============================================================
// GET /api/professional/cac-pricing
// Returns CAC charges and active status
// ============================================================
router.get('/cac-pricing', authenticateUser, cache(300), async (_req, res) => {
    try {
        let settings = await prisma.cACSettings.findFirst();
        if (!settings) {
            settings = await prisma.cACSettings.create({
                data: { charge: 5000, charge2: 15000, active: true }
            });
        }
        res.json({
            success: true,
            charge1: settings.charge,
            charge1Agent: settings.chargeAgent,
            charge1Vendor: settings.chargeVendor,
            charge1Base: settings.chargeBase,
            charge2: settings.charge2,
            charge2Agent: settings.charge2Agent,
            charge2Vendor: settings.charge2Vendor,
            charge2Base: settings.charge2Base,
            active: settings.active
        });
    } catch (error) {
        console.error('CAC pricing error:', error);
        res.status(500).json({ error: 'Failed to fetch CAC pricing' });
    }
});

// ============================================================
// GET /api/professional/cac-history
// Returns user's own CAC submissions
// ============================================================
router.get('/cac-history', authenticateUser, async (req, res) => {
    try {
        const registrations = await prisma.cACRegistration.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json({ success: true, registrations });
    } catch (error) {
        console.error('CAC history error:', error);
        res.status(500).json({ error: 'Failed to fetch CAC history' });
    }
});

// ============================================================
// POST /api/professional/cac-register
// Submit a CAC registration with file uploads
// ============================================================
router.post(
    '/cac-register',
    authenticateUser,
    cacUpload.fields([
        { name: 'directorIdCard', maxCount: 1 },
        { name: 'passportPhoto', maxCount: 1 }
    ]),
    async (req, res) => {
        try {
            // 1. Validate input
            const parsed = cacDetailsSchema.safeParse(req.body);
            if (!parsed.success) {
                const firstError = parsed.error.errors[0]?.message || 'Validation failed';
                return res.status(400).json({ error: firstError });
            }

            const data = parsed.data;

            // 2. Validate files and check magic numbers (Deep MIME-Type Validation)
            // Helper function to read magic number
            const isValidImageBuffer = (filePath) => {
                try {
                    const buffer = Buffer.alloc(4);
                    const fd = fs.openSync(filePath, 'r');
                    fs.readSync(fd, buffer, 0, 4, 0);
                    fs.closeSync(fd);
                    const hex = buffer.toString('hex').toUpperCase();
                    // JPEG: FFD8FFE0, FFD8FFE1, etc
                    // PNG: 89504E47
                    // WebP: 52494646 (RIFF) - actually need to check more bytes for WEBP but RIFF is good enough to prove it's not a php script
                    // GIF: 47494638
                    return hex.startsWith('FFD8FF') || hex.startsWith('89504E47') || hex.startsWith('47494638') || hex.startsWith('52494646');
                } catch(e) {
                    return false;
                }
            };
            const dirIdFile = req.files?.directorIdCard?.[0];
            const passportFile = req.files?.passportPhoto?.[0];
            if (!dirIdFile) return res.status(400).json({ error: 'Director ID card image is required' });
            if (!passportFile) return res.status(400).json({ error: 'Passport photograph is required' });

            if (!isValidImageBuffer(dirIdFile.path)) {
                fs.unlinkSync(dirIdFile.path); // Delete dangerous file
                return res.status(400).json({ error: 'Director ID card must be a valid image file' });
            }
            if (!isValidImageBuffer(passportFile.path)) {
                fs.unlinkSync(passportFile.path); // Delete dangerous file
                return res.status(400).json({ error: 'Passport photograph must be a valid image file' });
            }

            // 3. Verify PIN
            const pinResult = await verifyTransactionPin(req.user, data.pin);
            if (pinResult === null) return res.status(400).json({ error: 'No transaction PIN set.' });
            if (!pinResult) return res.status(400).json({ error: 'Invalid transaction PIN' });

            // 4. Get pricing
            const cacSettings = await prisma.cACSettings.findFirst();
            if (!cacSettings || !cacSettings.active) {
                return res.status(503).json({ error: 'CAC registration service is currently unavailable' });
            }

            const isLimited = data.businessType === 'limited';

            let amount = isLimited ? cacSettings.charge2 : cacSettings.charge;
            if (req.user.type === 2) amount = isLimited ? cacSettings.charge2Agent : cacSettings.chargeAgent;
            if (req.user.type === 3) amount = isLimited ? cacSettings.charge2Vendor : cacSettings.chargeVendor;

            const cost = isLimited ? cacSettings.charge2Base : cacSettings.chargeBase;
            const profit = amount - cost;

            // 5. Check balance
            if (req.user.wallet < amount) {
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }

            // 6. Build documents JSON
            const documents = JSON.stringify({
                directorIdCard: `/api/uploads/cac/${dirIdFile.filename}`,
                passportPhoto: `/api/uploads/cac/${passportFile.filename}`
            });

            // 7. Atomic transaction
            const result = await walletOps.transaction(async (tx) => {
                const transactionRef = `CAC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                const updatedUser = await walletOps.debit(tx, req.user.id, amount, { source: 'cac_registration', reference: transactionRef });

                // Create CACRegistration record
                const cacReg = await tx.cACRegistration.create({
                    data: {
                        userId: req.user.id,
                        businessName: data.businessName,
                        altBusinessName: data.altBusinessName,
                        businessType: data.businessType,
                        companyAddress: data.companyAddress,
                        residentialAddress: data.residentialAddress,
                        natureOfBusiness: data.natureOfBusiness,
                        shareCapital: data.shareCapital || null,
                        email: data.email,
                        phone: data.phone,
                        documents,
                        charge: amount,
                        status: 0
                    }
                });

                // Create ServiceRequest record
                const serviceReq = await tx.serviceRequest.create({
                    data: {
                        reference: transactionRef,
                        type: 'CAC_REG_SERVICE',
                        details: JSON.stringify({ cacRegistrationId: cacReg.id, ...data }),
                        amount,
                        status: 0,
                        userId: req.user.id,
                        updatedAt: new Date()
                    }
                });

                // Create transaction record
                await tx.transaction.create({
                    data: {
                        reference: transactionRef, // Use same reference as ServiceRequest
                        serviceName: 'CAC Registration',
                        description: `CAC ${isLimited ? 'Limited Liability' : 'Business Name'} Registration - ${data.businessName}`,
                        amount: -amount,
                        status: 0,
                        oldBalance: req.user.wallet,
                        newBalance: req.user.wallet - amount,
                        profit: profit > 0 ? profit : 0,
                        userId: req.user.id,
                        type: 'professional'
                    }
                });

                return { cacReg, serviceReq, transactionRef };
            });

            // Referral bonus will be credited upon admin approval
            res.json({
                success: true,
                message: 'CAC registration submitted successfully. Our team will review and process your request.',
                registration: result.cacReg
            });

            // Send notification to Admin
            const { sendAdminServiceRequestNotification } = require('../services/email.service');
            let detailsHtml = '<ul style="list-style: none; padding: 0;">';
            for (const [key, value] of Object.entries(data)) {
                if (key === 'pin') continue; // Don't send the user's PIN in the email!
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                detailsHtml += `<li style="margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px;"><strong>${formattedKey}:</strong> <span style="color: #444;">${value}</span></li>`;
            }

            // Add documents to details
            const parsedDocs = JSON.parse(documents);
            for (const [key, value] of Object.entries(parsedDocs)) {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const fullUrl = `${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}${value}`;
                const displayValue = `<br><a href="${fullUrl}" target="_blank" style="display:inline-block; margin-top:5px; padding:8px 15px; background:#e9ecef; color:#333; text-decoration:none; border-radius:4px; font-size:12px;">View Document</a>`;
                detailsHtml += `<li style="margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px;"><strong>${formattedKey}:</strong> <span style="color: #444;">${displayValue}</span></li>`;
            }
            detailsHtml += '</ul>';

            sendAdminServiceRequestNotification(req.user, 'CAC Registration', amount, result.transactionRef, detailsHtml)
                .catch(err => console.error('Failed to send admin CAC notification email:', err));

            // Send WhatsApp notification
            const whatsappMessage = `*New CAC Registration*\n\n` +
                `*User:* ${req.user.firstName} ${req.user.lastName} (${req.user.phone})\n` +
                `*Business:* ${data.businessName}\n` +
                `*Type:* ${data.businessType}\n` +
                `*Amount:* ₦${parseFloat(amount).toLocaleString()}\n` +
                `*Ref:* ${result.transactionRef}\n\n` +
                `Please review in the CAC Dashboard.`;

            whatsappService.sendMessage(whatsappMessage)
                .catch(err => console.error('Failed to send admin CAC notification whatsapp:', err));

        } catch (error) {
            // Multer errors
            if (error instanceof multer.MulterError) {
                if (error.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large. Maximum 5MB allowed.' });
                }
                return res.status(400).json({ error: error.message });
            }
            console.error('CAC registration error:', error);
            res.status(500).json({ error: error.message || 'Failed to submit CAC registration' });
        }
    }
);

// ============================================================
// POST /api/professional/request
// Create a professional service request (NIN, BVN)
// ============================================================
router.post('/request', authenticateUser, async (req, res) => {
    try {
        const { type, details, pin } = req.body;

        // 1. Verify Transaction PIN
        const pinResult = await verifyTransactionPin(req.user, pin);
        if (pinResult === null) return res.status(400).json({ error: 'No transaction PIN set.' });
        if (!pinResult) return res.status(400).json({ error: 'Invalid transaction PIN' });

        // 2. Get pricing based on service type
        let amount = 0;
        let cost = 0;

        if (type === 'BVN_SLIP_SERVICE') {
            const pricing = await bvnService.getBvnPricing(req.user.type || 1, details.slipType || 'regular');
            amount = pricing.userPrice;
            cost = pricing.apiPrice;

            if (!pricing.settings.active) {
                return res.status(503).json({ error: 'BVN verification service is currently unavailable' });
            }
        } else if (type === 'NIN_SLIP_SERVICE') {
            const slipType = details.slipType || 'regular';

            if (!['regular', 'standard', 'premium', 'vnin'].includes(slipType)) {
                return res.status(400).json({ error: 'Invalid slip type' });
            }

            const pricing = await ninService.getNinPricing(slipType, req.user.type || 1);
            amount = pricing.userPrice;
            cost = pricing.apiPrice;

            if (!pricing.settings.ninActive) {
                return res.status(503).json({ error: 'NIN verification service is currently unavailable' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid service type. Use /cac-register for CAC.' });
        }

        const profit = amount - cost;

        // 3. Pre-validate input details BEFORE debiting the user's wallet
        if (type === 'BVN_SLIP_SERVICE') {
            const rawBvn = String(details?.bvnNumber || details?.bvn || '').trim();
            if (!rawBvn) return res.status(400).json({ error: 'BVN number is required' });
            if (!/^\d{11}$/.test(rawBvn)) {
                return res.status(400).json({ error: 'Invalid BVN. BVN must be exactly 11 numeric digits with no spaces or letters.' });
            }
        } else if (type === 'NIN_SLIP_SERVICE') {
            const lookupMethod = details?.lookupMethod || 'nin';
            const rawNum = String((lookupMethod === 'phone' ? (details?.phoneNumber || details?.phone) : (details?.nin || details?.ninNumber)) || '').trim();
            if (!rawNum) {
                const label = lookupMethod === 'phone' ? 'Phone number' : 'NIN number';
                return res.status(400).json({ error: `${label} is required` });
            }
            if (lookupMethod === 'phone') {
                const cleanPhone = rawNum.replace(/\s+/g, '');
                if (!/^(0|\+?234)?[789][01]\d{8}$/.test(cleanPhone)) {
                    return res.status(400).json({ error: 'Invalid phone number format. Please enter a valid 11-digit Nigerian phone number.' });
                }
            } else {
                if (!/^\d{11}$/.test(rawNum)) {
                    return res.status(400).json({ error: 'Invalid NIN. NIN must be exactly 11 numeric digits with no spaces or letters.' });
                }
            }
        }

        // 4. Check Balance
        if (req.user.wallet < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 4. Atomic Transaction
        const result = await walletOps.transaction(async (tx) => {
            const transactionRef = crypto.randomBytes(16).toString('hex');
            const updatedUser = await walletOps.debit(tx, req.user.id, amount, { source: 'professional_service', reference: transactionRef });
            const request = await tx.serviceRequest.create({
                data: {
                    reference: transactionRef,
                    type,
                    details: JSON.stringify(details),
                    amount,
                    status: 0,
                    userId: req.user.id,
                    updatedAt: new Date()
                }
            });

            await tx.transaction.create({
                data: {
                    reference: transactionRef, // Use same reference as ServiceRequest
                    serviceName: type.replace(/_/g, ' '),
                    description: `Request for ${type.replace(/_/g, ' ')}`,
                    amount: -amount,
                    status: 0,
                    oldBalance: updatedUser.wallet + amount,
                    newBalance: updatedUser.wallet,
                    profit: profit > 0 ? profit : 0,
                    userId: req.user.id,
                    type: 'professional'
                }
            });

            return { request, transactionRef, postDebitWallet: updatedUser.wallet };
        });

        // 5. Process BVN verification
        if (type === 'BVN_SLIP_SERVICE') {
            const bvnNumber = details.bvnNumber || details.bvn;
            if (!bvnNumber) return res.status(400).json({ error: 'BVN number is required' });

            // Run asynchronously to prevent HTTP timeout
            setImmediate(async () => {
                try {
                    const verificationResult = await bvnService.processBvnVerification(
                        req.user.id, bvnNumber, result.transactionRef, req.user.type || 1, details.slipType || 'regular'
                    );

                    if (verificationResult.success) {
                        await prisma.serviceRequest.update({
                            where: { id: result.request.id },
                            data: {
                                status: 1,
                                details: JSON.stringify({
                                    ...details,
                                    reportId: verificationResult.report.id,
                                    pdfUrl: verificationResult.report.pdfUrl,
                                    report: verificationResult.report
                                })
                            }
                        });

                        // Trigger referral bonus
                        const pricing = await bvnService.getBvnPricing(req.user.type || 1);
                        creditReferralBonus(req.user.id, 'bvn', pricing.settings.referralCommission || 0).catch(err => console.error('BVN Bonus error:', err));
                    } else {
                        let refundAmount = amount;
                        let errorMsg = verificationResult.message || 'Verification failed';
                        let finalStatus = 2;
                        
                        if (verificationResult.notFound) {
                            refundAmount = amount - 100; // Deduct 100 NGN charge
                            errorMsg = `${errorMsg} (₦100 service charge applied)`;
                        }

                        await walletOps.transaction(async (tx) => {
                            const refund = await walletOps.refundInTransaction(tx, result.transactionRef, `BVN verification refund: ${errorMsg}`, Math.max(0, refundAmount));
                            await tx.serviceRequest.update({
                                where: { id: result.request.id },
                                data: { status: finalStatus, details: JSON.stringify({ ...details, error: errorMsg }) }
                            });
                            await tx.transaction.update({
                                where: { reference: result.transactionRef },
                                data: {
                                    status: 2,
                                    newBalance: refund.user.wallet,
                                    profit: verificationResult.notFound ? Math.min(amount, 100) : 0,
                                    description: errorMsg
                                }
                            });
                        });
                    }
                } catch (error) {
                    console.error('BVN Async Processing Error:', error);
                    await require('../services/security.service').event(prisma, {
                        kind: 'provider_reconciliation', severity: 'critical', userId: req.user.id,
                        source: 'bvn_verification', reference: result.transactionRef,
                        metadata: { reason: 'Verification or refund could not be finalized. Check provider delivery and debit evidence before refunding.' }
                    }, true).catch(alertError => console.error('BVN reconciliation alert failed:', alertError.message));
                }
            });

            return res.json({
                success: true,
                message: 'Processing your BVN slip...',
                status: 'pending',
                request: result.request,
                transactionRef: result.transactionRef
            });
        }

        // 6. Process NIN verification
        if (type === 'NIN_SLIP_SERVICE') {
            const lookupMethod = details.lookupMethod || 'nin';
            const ninNumber = lookupMethod === 'phone'
                ? (details.phoneNumber || details.phone)
                : (details.nin || details.ninNumber);
            const slipType = details.slipType || 'regular';

            if (!ninNumber) {
                const fieldLabel = lookupMethod === 'phone' ? 'Phone number' : 'NIN number';
                return res.status(400).json({ error: `${fieldLabel} is required` });
            }

            // Run asynchronously to prevent HTTP timeout
            setImmediate(async () => {
                try {
                    const verificationResult = await ninService.processNinVerification(
                        req.user.id, ninNumber, slipType, result.transactionRef, req.user.type || 1, lookupMethod
                    );

                    if (verificationResult.success) {
                        await prisma.serviceRequest.update({
                            where: { id: result.request.id },
                            data: {
                                status: 1,
                                details: JSON.stringify({
                                    ...details,
                                    reportId: verificationResult.report.id,
                                    pdfUrl: verificationResult.report.pdfUrl,
                                    report: verificationResult.report
                                })
                            }
                        });

                        // Trigger referral bonus
                        const pricing = await ninService.getNinPricing(slipType, req.user.type || 1);
                        creditReferralBonus(req.user.id, 'nin', pricing.settings.referralCommission || 0).catch(err => console.error('NIN Bonus error:', err));
                    } else {
                        let refundAmount = amount;
                        let errorMsg = verificationResult.message || 'Verification failed';
                        let finalStatus = 2;
                        
                        if (verificationResult.notFound) {
                            refundAmount = amount - 100; // Deduct 100 NGN charge
                            errorMsg = `${errorMsg} (₦100 service charge applied)`;
                        }

                        await walletOps.transaction(async (tx) => {
                            const refund = await walletOps.refundInTransaction(tx, result.transactionRef, `NIN verification refund: ${errorMsg}`, Math.max(0, refundAmount));
                            await tx.serviceRequest.update({
                                where: { id: result.request.id },
                                data: { status: finalStatus, details: JSON.stringify({ ...details, error: errorMsg }) }
                            });
                            await tx.transaction.update({
                                where: { reference: result.transactionRef },
                                data: {
                                    status: 2,
                                    newBalance: refund.user.wallet,
                                    profit: verificationResult.notFound ? Math.min(amount, 100) : 0,
                                    description: errorMsg
                                }
                            });
                        });
                    }
                } catch (error) {
                    console.error('NIN Async Processing Error:', error);
                    await require('../services/security.service').event(prisma, {
                        kind: 'provider_reconciliation', severity: 'critical', userId: req.user.id,
                        source: 'nin_verification', reference: result.transactionRef,
                        metadata: { reason: 'Verification or refund could not be finalized. Check provider delivery and debit evidence before refunding.' }
                    }, true).catch(alertError => console.error('NIN reconciliation alert failed:', alertError.message));
                }
            });

            return res.json({
                success: true,
                message: 'Processing your NIN slip...',
                status: 'pending',
                request: result.request,
                transactionRef: result.transactionRef
            });
        }

        // Fallback
        res.json({
            success: true,
            message: 'Request submitted successfully.',
            request: result.request
        });
    } catch (error) {
        console.error('Professional service error:', error);
        res.status(500).json({ error: 'Failed to submit request' });
    }
});

// ============================================================
// GET /api/professional/request-status/:reference
// Polling endpoint for checking the status of an async request
// ============================================================
router.get('/request-status/:reference', authenticateUser, async (req, res) => {
    try {
        const { reference } = req.params;
        const request = await prisma.serviceRequest.findFirst({
            where: { reference, userId: req.user.id }
        });

        if (!request) return res.status(404).json({ error: 'Request not found' });

        const details = JSON.parse(request.details || '{}');

        if (request.status === 0) {
            return res.json({ success: true, status: 'pending' });
        } else if (request.status === 1) {
            // Find full report from details, ninReport or bvnReport tables
            let fullReport = details.report ? { ...details.report } : { ...details };

            // Always look up the latest record from ninReport or bvnReport to ensure full demography
            const ninReport = await prisma.ninReport.findUnique({
                where: { transactionRef: reference }
            });
            if (ninReport) {
                const { rawResponse, ...safeNin } = ninReport;
                let rawData = {};
                try { rawData = JSON.parse(rawResponse || '{}'); } catch (_) {}
                fullReport = {
                    ...fullReport,
                    ...rawData,
                    ...safeNin,
                    firstName: ninReport.firstName || rawData.firstName || rawData.first_name || rawData.firstname,
                    lastName: ninReport.surname || rawData.surname || rawData.last_name || rawData.lastname,
                    surname: ninReport.surname || rawData.surname || rawData.last_name || rawData.lastname,
                    middleName: ninReport.middleName || rawData.middleName || rawData.middle_name || rawData.middlename,
                    dateOfBirth: ninReport.dateOfBirth || rawData.dateOfBirth || rawData.date_of_birth || rawData.birthdate || rawData.dob,
                    gender: ninReport.gender || rawData.gender,
                    phoneNumber: rawData.telephoneno || rawData.telephone || rawData.phone || rawData.phoneNumber || rawData.phone_number || rawData.mobile,
                    nin: ninReport.ninNumber || rawData.nin || rawData.number_nin,
                    ninNumber: ninReport.ninNumber || rawData.nin || rawData.number_nin,
                    trackingId: ninReport.trackingId || rawData.trackingId || rawData.tracking_id,
                    stateOfOrigin: rawData.state_of_origin || rawData.origin_state || rawData.stateOfOrigin || rawData.originState,
                    lgaOfOrigin: rawData.lga_of_origin || rawData.origin_lga || rawData.lgaOfOrigin || rawData.originLga,
                    stateOfResidence: ninReport.residenceState || rawData.residence_state || rawData.residenceState || rawData.state,
                    lgaOfResidence: ninReport.residenceLga || rawData.residence_lga || rawData.residenceLga || rawData.lga,
                    residentialAddress: ninReport.residenceAddress || rawData.residence_address || rawData.residenceAddress || rawData.address,
                    base64Photo: ninReport.base64Photo || rawData.base64Photo || rawData.base64_photo || rawData.photo || rawData.image,
                };
            } else {
                // Look up in bvnReport
                const bvnReport = await prisma.bvnReport.findUnique({
                    where: { transactionRef: reference }
                });
                if (bvnReport) {
                    const { rawResponse, ...safeBvn } = bvnReport;
                    let rawData = {};
                    try { rawData = JSON.parse(rawResponse || '{}'); } catch (_) {}
                    fullReport = {
                        ...fullReport,
                        ...rawData,
                        ...safeBvn,
                        firstName: bvnReport.firstName || rawData.firstName || rawData.first_name,
                        lastName: bvnReport.lastName || rawData.lastName || rawData.last_name || rawData.surname,
                        middleName: bvnReport.middleName || rawData.middleName || rawData.middle_name,
                        dateOfBirth: bvnReport.dateOfBirth || rawData.dateOfBirth || rawData.date_of_birth || rawData.dob,
                        gender: bvnReport.gender || rawData.gender,
                        phoneNumber: bvnReport.phoneNumber || rawData.phoneNumber || rawData.phone_number || rawData.phone || rawData.telephoneno,
                        bvn: bvnReport.bvnNumber || rawData.bvn || rawData.bvnNumber,
                        bvnNumber: bvnReport.bvnNumber || rawData.bvn || rawData.bvnNumber,
                        nin: bvnReport.nin || rawData.nin,
                        maritalStatus: bvnReport.maritalStatus || rawData.maritalStatus || rawData.marital_status,
                        enrollmentBank: bvnReport.enrollmentBank || rawData.enrollmentBank || rawData.enrollment_bank,
                        enrollmentBranch: bvnReport.enrollmentBranch || rawData.enrollmentBranch || rawData.enrollment_branch,
                        stateOfOrigin: bvnReport.stateOfOrigin || rawData.stateOfOrigin || rawData.state_of_origin,
                        lgaOfOrigin: bvnReport.lgaOfOrigin || rawData.lgaOfOrigin || rawData.lga_of_origin,
                        stateOfResidence: bvnReport.stateOfResidence || rawData.stateOfResidence || rawData.state_of_residence,
                        lgaOfResidence: bvnReport.lgaOfResidence || rawData.lgaOfResidence || rawData.lga_of_residence,
                        residentialAddress: bvnReport.residentialAddress || rawData.residentialAddress || rawData.residential_address || rawData.address,
                        base64Photo: bvnReport.base64Image || rawData.base64Image || rawData.base64Photo || rawData.photo || rawData.image,
                    };
                }
            }

            // Point pdfUrl to the authenticated download endpoint
            fullReport.pdfUrl = `/api/slips/by-ref/${reference}/download`;
            fullReport.transactionRef = reference;
            if (details.slipType && !fullReport.slipType) {
                fullReport.slipType = details.slipType;
            }

            return res.json({ success: true, status: 'completed', report: fullReport });
        } else {
            return res.json({ success: false, status: 'failed', error: details.error || 'Verification failed' });
        }
    } catch (error) {
        console.error('Professional service status error:', error);
        res.status(500).json({ error: 'Failed to fetch request status' });
    }
});

module.exports = router;
