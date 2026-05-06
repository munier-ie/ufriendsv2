const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { z } = require('zod');
const crypto = require('crypto');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for logo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/logos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|svg|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed (jpeg, jpg, png, svg, webp)'));
    }
});

/**
 * @route   POST /api/reseller/upload-logo
 * @desc    Upload a logo for the reseller onboarding
 * @access  Public
 */
router.post('/upload-logo', upload.single('logo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file' });
        }
        const logoUrl = `/uploads/logos/${req.file.filename}`;
        res.json({ success: true, logoUrl });
    } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});

// Validation schema for reseller request
const resellerRequestSchema = z.object({
    contactEmail: z.string().email().trim(),
    contactPhone: z.string().min(10).max(15).trim(),
    platforms: z.array(z.enum(['web', 'android', 'ios'])).min(1),
    hostingType: z.enum(['managed', 'ownership']),
    extras: z.array(z.enum(['printing', 'manual'])),
    publishing: z.object({
        android: z.enum(['none', 'shared', 'personal']),
        ios: z.enum(['none', 'shared', 'personal'])
    })
});

// GET /api/reseller/prices - Fetch active software options and prices
router.get(['/prices', '/options'], async (req, res) => {
    try {
        const options = await prisma.softwareOption.findMany({
            where: { active: true }
        });
        res.json(options);
    } catch (error) {
        console.error('Error fetching reseller prices:', error);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

router.get('/paystack-config', async (req, res) => {
    try {
        const paystack = await prisma.paymentGateway.findFirst({
            where: { provider: 'PAYSTACK', active: true }
        });

        if (!paystack) {
            console.error('[PaystackConfig] No active PAYSTACK gateway found in DB');
            return res.status(404).json({ error: 'Paystack not configured' });
        }

        // Resolve the public key: check secretKey first (preferred), then apiKey
        // A Paystack public key always starts with 'pk_'
        let publicKey = null;
        if (paystack.secretKey?.startsWith('pk_')) {
            publicKey = paystack.secretKey;
        } else if (paystack.apiKey?.startsWith('pk_')) {
            // Fallback: some setups store the public key in apiKey
            publicKey = paystack.apiKey;
        }

        if (!publicKey) {
            console.error('[PaystackConfig] No pk_ key found. apiKey starts with:', paystack.apiKey?.substring(0, 10), '| secretKey starts with:', paystack.secretKey?.substring(0, 10));
            return res.status(400).json({ error: 'Paystack Public Key not configured. Please set a pk_ key in payment gateway settings.' });
        }

        res.json({ publicKey });
    } catch (error) {
        console.error('[PaystackConfig] Error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/reseller/request - Submit a new reseller request
router.post('/request', async (req, res) => {
    try {
        // 1. Validate Input (XSS/Forgery protection)
        const validatedData = resellerRequestSchema.parse(req.body);
        
        // 2. Fetch prices from DB (Security: Prevent Price Manipulation)
        const dbOptions = await prisma.softwareOption.findMany({
            where: { active: true }
        });

        // 3. Calculate Total ON BACKEND
        let total = 0;
        const findPrice = (cat, name) => {
            const opt = dbOptions.find(o => o.category === cat && o.name === name);
            return opt ? opt.price : 0;
        };

        validatedData.platforms.forEach(p => {
            // Hosting/Ownership price depends on platform
            total += findPrice(p, validatedData.hostingType);
            
            // Publishing prices
            if (p === 'android' && validatedData.publishing.android !== 'none') {
                total += findPrice('publishing_android', validatedData.publishing.android);
            }
            if (p === 'ios' && validatedData.publishing.ios !== 'none') {
                total += findPrice('publishing_ios', validatedData.publishing.ios);
            }
        });

        // Extras
        validatedData.extras.forEach(e => {
            total += findPrice('extra', e);
        });

        if (total <= 0) {
            return res.status(400).json({ error: 'Invalid configuration resulting in zero price' });
        }

        // 4. Generate Reference
        const paymentRef = `RES-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        
        const metadata = {
            type: 'reseller_setup',
            requestData: {
                contactEmail: validatedData.contactEmail,
                contactPhone: validatedData.contactPhone,
                platforms: validatedData.platforms,
                hostingType: validatedData.hostingType,
                extras: validatedData.extras,
                publishing: validatedData.publishing,
                totalAmount: total
            }
        };

        // 5. Initiate Payment (Paystack Example)
        // Check if Paystack is configured and active
        const paystack = await prisma.paymentGateway.findFirst({
            where: { provider: 'PAYSTACK', active: true }
        });

        let paymentUrl = null;
        if (paystack) {
            try {
                const response = await axios.post(
                    'https://api.paystack.co/transaction/initialize',
                    {
                        email: validatedData.contactEmail,
                        amount: Math.round(total * 100), // Paystack uses kobo
                        reference: paymentRef,
                        callback_url: `${process.env.FRONTEND_URL}/reseller/callback`,
                        metadata
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${paystack.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.data.status) {
                    paymentUrl = response.data.data.authorization_url;
                }
            } catch (err) {
                console.error('Paystack initialization error:', err.response?.data || err.message);
                // Fallback to manual if payment initiation fails
            }
        }

        res.status(201).json({
            success: true,
            message: 'Payment initiated',
            paymentRef,
            paymentUrl,
            totalAmount: total,
            metadata
        });



    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input data', details: error.errors });
        }
        console.error('Reseller request error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

/**
 * @route   GET /api/reseller/status/:reference
 * @desc    Get the status and delivery info for a reseller request
 * @access  Public
 */
router.get('/status/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        const request = await prisma.resellerRequest.findUnique({
            where: { paymentRef: reference }
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(request);
    } catch (error) {
        console.error('Reseller status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route   GET /api/reseller/verify/:reference
 * @desc    Verify a Paystack transaction for a reseller request
 * @access  Public
 */
router.get('/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        console.log(`[ResellerVerify] Verifying reference: ${reference}`);

        // 1. Check if it already exists (already verified)
        let request = await prisma.resellerRequest.findUnique({
            where: { paymentRef: reference }
        });

        if (request && request.paymentStatus === 'paid') {
            console.log(`[ResellerVerify] Request already verified for: ${reference}`);
            return res.json({ success: true, message: 'Payment already verified', status: request.status });
        }

        // 2. Fetch Paystack settings
        const paystack = await prisma.paymentGateway.findFirst({
            where: { provider: 'PAYSTACK', active: true }
        });

        if (!paystack) {
            console.error('[ResellerVerify] Paystack not configured');
            return res.status(500).json({ error: 'Payment gateway not configured' });
        }

        // 3. Call Paystack Verify API
        console.log(`[ResellerVerify] Calling Paystack API for: ${reference}`);
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    'Authorization': `Bearer ${paystack.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = response.data.data;
        if (response.data.status && data.status === 'success') {
            console.log(`[ResellerVerify] Paystack success for: ${reference}`);
            
            // Check if record already created (concurrency)
            if (!request) {
                let metadata = data.metadata;
                console.log('[ResellerVerify] Metadata raw type:', typeof metadata);
                
                // Paystack sometimes stringifies metadata
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch (e) {
                        console.error('[ResellerVerify] Failed to parse stringified metadata');
                    }
                }

                console.log('[ResellerVerify] Metadata object:', JSON.stringify(metadata));

                if (!metadata || metadata.type !== 'reseller_setup' || !metadata.requestData) {
                    console.error('[ResellerVerify] Invalid or missing metadata. Type:', metadata?.type);
                    return res.status(400).json({ error: 'Invalid transaction metadata' });
                }

                const rd = metadata.requestData;

                // SECURITY: Validate amount
                const expectedAmountKobo = Math.round(rd.totalAmount * 100);
                if (Math.abs(data.amount - expectedAmountKobo) > 1) {
                    console.error(`[ResellerVerify] Amount mismatch. Got: ${data.amount}, Expected: ${expectedAmountKobo}`);
                    return res.status(400).json({ error: 'Amount mismatch detected' });
                }

                // Create the record NOW
                console.log(`[ResellerVerify] Creating DB record for: ${rd.contactEmail}`);
                request = await prisma.resellerRequest.create({
                    data: {
                        contactEmail: rd.contactEmail,
                        contactPhone: rd.contactPhone,
                        platforms: rd.platforms,
                        hostingType: rd.hostingType,
                        extras: rd.extras,
                        publishing: rd.publishing,
                        totalAmount: parseFloat(rd.totalAmount),
                        paymentRef: reference,
                        paymentStatus: 'paid',
                        status: 'processing'
                    }
                });
            }

            // Trigger Notifications
            const { sendResellerConfirmation, sendResellerAdminAlert } = require('../services/email.service');
            sendResellerConfirmation(request).catch(e => console.error('[ResellerVerify] User email failed:', e));
            sendResellerAdminAlert(request).catch(e => console.error('[ResellerVerify] Admin email failed:', e));

            return res.json({ 
                success: true, 
                message: 'Payment verified and request recorded', 
                status: request.status 
            });
        } else {
            console.error(`[ResellerVerify] Paystack reported failure/pending: ${data?.status}`);
            return res.status(400).json({ 
                error: 'Payment verification failed', 
                paystackStatus: data?.status 
            });
        }
    } catch (error) {
        console.error('[ResellerVerify] Critical error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

/**
 * @route   POST /api/reseller/onboarding/:reference
 * @desc    Submit onboarding data (branding info) after payment
 * @access  Public
 */
router.post('/onboarding/:reference', async (req, res) => {
    try {
        const { reference } = req.params;
        const { appName, logo, domain, ...colors } = req.body;

        if (!appName || !colors.primaryColor) {
            return res.status(400).json({ error: 'App name and primary color are required' });
        }

        const request = await prisma.resellerRequest.findUnique({
            where: { paymentRef: reference }
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.paymentStatus !== 'paid') {
            return res.status(400).json({ error: 'Payment must be verified before onboarding' });
        }

        const updated = await prisma.resellerRequest.update({
            where: { id: request.id },
            data: {
                onboardingCompleted: true,
                onboardingData: {
                    appName,
                    ...colors,
                    logo,
                    domain,
                    submittedAt: new Date().toISOString()
                }
            }
        });

        // Notify Admin about new onboarding data
        const { sendAdminAlert, sendEmail } = require('../services/email.service');
        
        // 1. Alert Admin
        sendAdminAlert(
            'Reseller Onboarding Data Submitted',
            `Branding info for ${request.contactEmail} (Ref: ${reference}) has been submitted.\n\n` +
            `App Name: ${appName}\n` +
            `Primary Color: ${colors.primaryColor}\n` +
            `Domain: ${domain || 'N/A'}`
        ).catch(e => console.error('Admin onboarding alert failed:', e));

        // 2. Confirmation to User
        const userSubject = 'Branding Details Received - Setup Progressing';
        const userHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>We've Received Your Branding Details!</h2>
                <p>Hello,</p>
                <p>Thank you for submitting your branding information for <strong>${appName}</strong>. Our technical team is now working on the final deployment.</p>
                <p><strong>Configured Domain:</strong> ${domain || 'Pending'}.com.ng</p>
                <p>We will notify you as soon as your platform is live.</p>
                <br>
                <p>Best regards,<br>The Ufriends Team</p>
            </div>
        `;
        sendEmail(request.contactEmail, userSubject, userHtml).catch(e => console.error('User onboarding confirmation failed:', e));

        res.json({ success: true, message: 'Onboarding data submitted successfully' });
    } catch (error) {
        console.error('Reseller onboarding error:', error);
        res.status(500).json({ error: 'Failed to submit onboarding data' });
    }
});

module.exports = router;
