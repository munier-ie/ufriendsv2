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

// ============================================================
// GET /api/professional/cac-pricing
// Returns CAC charges and active status
// ============================================================
router.get('/cac-pricing', authenticateUser, async (_req, res) => {
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
            const result = await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id: req.user.id },
                    data: { wallet: { decrement: amount } }
                });

                const transactionRef = `CAC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

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

        // 3. Check Balance
        if (req.user.wallet < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 4. Atomic Transaction
        const result = await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: req.user.id },
                data: { wallet: { decrement: amount } }
            });

            const transactionRef = crypto.randomBytes(16).toString('hex');
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
                    oldBalance: req.user.wallet,
                    newBalance: req.user.wallet - amount,
                    profit: profit > 0 ? profit : 0,
                    userId: req.user.id,
                    type: 'professional'
                }
            });

            return { request, transactionRef };
        });

        // 5. Process BVN verification
        if (type === 'BVN_SLIP_SERVICE') {
            const bvnNumber = details.bvnNumber || details.bvn;
            if (!bvnNumber) return res.status(400).json({ error: 'BVN number is required' });

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
                            pdfUrl: verificationResult.report.pdfUrl
                        })
                    }
                });

                // Trigger referral bonus
                const pricing = await bvnService.getBvnPricing(req.user.type || 1);
                creditReferralBonus(req.user.id, 'bvn', pricing.settings.referralCommission || 0).catch(err => console.error('BVN Bonus error:', err));

                return res.json({
                    success: true,
                    message: verificationResult.message,
                    request: result.request,
                    report: verificationResult.report
                });
            } else {
                await prisma.serviceRequest.update({
                    where: { id: result.request.id },
                    data: { status: 2, details: JSON.stringify({ ...details, error: verificationResult.message }) }
                });
                await prisma.user.update({
                    where: { id: req.user.id },
                    data: { wallet: { increment: amount } }
                });
                return res.status(400).json({ success: false, error: verificationResult.message });
            }
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
                            pdfUrl: verificationResult.report.pdfUrl
                        })
                    }
                });

                // Trigger referral bonus
                const pricing = await ninService.getNinPricing(slipType, req.user.type || 1);
                creditReferralBonus(req.user.id, 'nin', pricing.settings.referralCommission || 0).catch(err => console.error('NIN Bonus error:', err));

                return res.json({
                    success: true,
                    message: verificationResult.message,
                    request: result.request,
                    report: verificationResult.report
                });
            } else {
                await prisma.serviceRequest.update({
                    where: { id: result.request.id },
                    data: { status: 2, details: JSON.stringify({ ...details, error: verificationResult.message }) }
                });
                await prisma.user.update({
                    where: { id: req.user.id },
                    data: { wallet: { increment: amount } }
                });
                return res.status(400).json({ success: false, error: verificationResult.message });
            }
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

module.exports = router;
