const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const { sendWelcomeEmail, sendLoginAlert } = require('../services/email.service');
const paymentpointService = require('../services/paymentpoint.service');
const { generateUniqueCode } = require('../utils/referral.utils');
const authenticateUser = require('../middleware/auth');
const loginRateLimit = require('../middleware/loginRateLimit');

// Per-phone OTP email rate limit (3 emails per phone per 10 minutes)
const otpEmailAttempts = new Map(); // phone -> { count, resetAt }
const OTP_EMAIL_MAX = 3;
const OTP_EMAIL_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkOtpEmailLimit(phone) {
    const now = Date.now();
    const record = otpEmailAttempts.get(phone) || { count: 0, resetAt: now + OTP_EMAIL_WINDOW_MS };
    if (now > record.resetAt) {
        // Window expired, reset
        otpEmailAttempts.set(phone, { count: 1, resetAt: now + OTP_EMAIL_WINDOW_MS });
        return { allowed: true };
    }
    if (record.count >= OTP_EMAIL_MAX) {
        const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
        return { allowed: false, waitSeconds };
    }
    record.count++;
    otpEmailAttempts.set(phone, record);
    return { allowed: true };
}

// Validation Schemas
const registerSchema = z.object({
    firstName: z.string().trim().min(2),
    lastName: z.string().trim().min(2),
    email: z.string().trim().email().toLowerCase(),
    phone: z.string().trim().min(10),
    password: z.string().min(6),
    pin: z.string().length(4),
    state: z.string().trim().optional(),
    referral: z.string().trim().optional(),
    type: z.number().int().min(1).max(3).default(1)
});

const loginSchema = z.object({
    phone: z.string().trim().min(10),
    password: z.string().min(1)
});

// Register
router.post('/register', async (req, res) => {
    try {
        // Validate input
        const validation = registerSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.errors[0].message });
        }

        // Check if registration is enabled
        const settingsService = require('../services/settings.service');
        const registrationEnabled = await settingsService.getSetting('registrationEnabled', true);
        if (!registrationEnabled) {
            return res.status(403).json({ error: 'Registration is temporarily disabled by the administrator.' });
        }

        const { firstName, lastName, email, phone, password, pin, state, referral, type } = validation.data;

        // Check existing
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedPin = await bcrypt.hash(pin, 10);


        let validReferral = null;
        let referredBy = null;

        // Handle Referral Code
        if (referral) {
            const referrer = await prisma.user.findUnique({ where: { referralCode: referral } });
            if (referrer) {
                referredBy = referral;
                // Update referrer's wallet (optional: add bonus logic here later)
            } else {
                // Fallback: check if referral is phone number (legacy support)
                const referrerByPhone = await prisma.user.findUnique({ where: { phone: referral } });
                if (referrerByPhone) {
                    referredBy = referrerByPhone.referralCode;
                }
            }
        }

        const referralCode = await generateUniqueCode(prisma);

        const user = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                password: hashedPassword,
                transactionPin: hashedPin, // Use new field
                pinEnabled: true,          // Enable PIN by default
                state,
                referredBy: referredBy,    // Store referrer code
                referral: referral,        // Store raw input for legacy tracking
                referralCode,              // Store new short code
                type: type || 1,
                apiKey: require('crypto').randomBytes(32).toString('hex')
            }
        });

        // Send Welcome Email
        sendWelcomeEmail(user).catch(err => console.error('Email error:', err));

        // Auto-generate PaymentPoint Virtual Account asynchronously without blocking registration response
        paymentpointService.createVirtualAccount({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            phoneNumber: user.phone,
            bankCodes: ['20946'] // Palmpay
        }).then(async (paymentpointResponse) => {
            if (paymentpointResponse.success) {
                const accountDetails = paymentpointResponse.accountDetails;
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        bankName: 'Palmpay (PaymentPoint)',
                        bankNo: accountDetails.bankAccounts?.[0]?.accountNumber,
                        accountReference: `PP_${user.phone}_${user.id}`
                    }
                });
                console.log(`Auto-generated PaymentPoint virtual account for user ID ${user.id}`);
            }
        }).catch(err => {
            console.error(`Failed to auto-generate PaymentPoint virtual account for ${user.email}:`, err.message);
        });

        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login (renamed to access to bypass WAF rules on /login and /signin paths)
router.post('/access', loginRateLimit, async (req, res) => {
    try {
        // Validate input
        const validation = loginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Invalid input" });
        }

        const { phone, password } = validation.data;

        // Find user
        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
            if (req._recordLoginFailure) req._recordLoginFailure();
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Strict Bcrypt check only
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            const result = req._recordLoginFailure ? req._recordLoginFailure() : { count: 0, waitSeconds: 0 };
            let errorMsg = 'Invalid credentials';
            if (result.waitSeconds > 0) {
                const mins = Math.floor(result.waitSeconds / 60);
                const secs = result.waitSeconds % 60;
                const timeStr = mins > 0 ? `${mins}m ${secs > 0 ? secs + 's' : ''}`.trim() : `${secs}s`;
                errorMsg = `Invalid credentials. Too many failed attempts — try again in ${timeStr}.`;
            }
            return res.status(400).json({ error: errorMsg, retryAfter: result.waitSeconds || 0 });
        }

        // Email Verification Check (First Login)
        if (user.emailVerified === false) {
            // Per-phone OTP rate limiting
            const otpLimit = checkOtpEmailLimit(phone);
            if (!otpLimit.allowed) {
                return res.status(429).json({
                    error: `Too many OTP requests. Please wait ${Math.ceil(otpLimit.waitSeconds / 60)} minute(s) before requesting another.`,
                    retryAfter: otpLimit.waitSeconds
                });
            }

            // [SEC-HIGH-04] Use cryptographically secure OTP generator
            const otpCode = crypto.randomInt(100000, 999999);
            const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
            });
            
            const nodemailer = require('nodemailer');
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_PORT === '465',
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                });
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                    to: user.email,
                    subject: 'UFriends Email Verification',
                    html: `<p>Hello ${user.firstName},</p>
                           <p>Welcome to Ufriends! Please verify your email.</p>
                           <p>Your verification code is: <strong style="font-size:24px;">${otpCode}</strong></p>
                           <p>This code expires in 15 minutes.</p>`
                });
            } catch (err) {
                console.error("Failed to send OTP email", err);
            }

            return res.json({ 
                success: true, 
                emailVerificationRequired: true, 
                userId: user.id,
                message: 'Please verify your email to continue. We have sent an OTP to your email.'
            });
        }

        // 2FA Check
        if (user.twoFaEnabled) {
            if (user.twoFaMethod === 'email') {
                // [SEC-HIGH-04] Use cryptographically secure OTP generator
                const otpCode = crypto.randomInt(100000, 999999);
                const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
                await prisma.user.update({
                    where: { id: user.id },
                    data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry } // reuse columns for 2fa
                });
                const nodemailer = require('nodemailer');
                try {
                    const transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST || 'smtp.gmail.com',
                        port: process.env.SMTP_PORT || 587,
                        secure: process.env.SMTP_PORT === '465',
                        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                    });
                    await transporter.sendMail({
                        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                        to: user.email,
                        subject: 'UFriends 2FA Login',
                        html: `<p>Hello ${user.firstName},</p>
                               <p>Your 2FA login code is: <strong style="font-size:24px;">${otpCode}</strong></p>
                               <p>This code expires in 10 minutes.</p>`
                    });
                } catch (err) {
                    console.error("Failed to send 2FA email", err);
                }
            }

            return res.json({ 
                success: true, 
                twoFaRequired: true, 
                twoFaMethod: user.twoFaMethod || 'totp',
                userId: user.id,
                message: 'Two-factor authentication required.'
            });
        }

        // Clear login rate limit on successful authentication
        loginRateLimit.onSuccess(phone);

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Single Device Login Logic
        // Invalidate all previous sessions
        await prisma.userLogin.deleteMany({
            where: { userId: user.id }
        });

        // Create new session
        await prisma.userLogin.create({
            data: {
                userId: user.id,
                token: token
            }
        });

        // Send Login Alert
        sendLoginAlert(user, req.headers['user-agent']).catch(err => console.error('Email error:', err));

        // Auto-generate Virtual Account if missing
        if (!user.bankNo) {
            paymentpointService.createVirtualAccount({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phoneNumber: user.phone,
                bankCodes: ['20946'] // Palmpay
            }).then(async (paymentpointResponse) => {
                if (paymentpointResponse.success) {
                    const accountDetails = paymentpointResponse.accountDetails;
                    if (accountDetails.bankAccounts?.[0]?.accountNumber) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                bankName: 'Palmpay (PaymentPoint)',
                                bankNo: accountDetails.bankAccounts[0].accountNumber,
                                accountReference: `PP_${user.phone}_${user.id}`
                            }
                        });
                        console.log(`Auto-generated virtual account on login for user ID ${user.id}`);
                    }
                }
            }).catch(err => {
                console.error(`Failed to auto-generate virtual account on login for ${user.email}:`, err.message);
            });
        }

        res.json({ token, user: { id: user.id, name: `${user.firstName} ${user.lastName}` } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Handle completing the login process after email verify or 2fa success.
 * Factor out the shared logic.
 */
async function completeLoginProcess(user, req, res) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Single Device Login Logic / Invalidate all previous sessions
    await prisma.userLogin.deleteMany({
        where: { userId: user.id }
    });

    // Create new session
    await prisma.userLogin.create({
        data: { userId: user.id, token: token }
    });

    // Send Login Alert
    sendLoginAlert(user, req.headers['user-agent']).catch(err => console.error('Email error:', err));

    // Auto-generate Virtual Account if missing
    if (!user.bankNo) {
        paymentpointService.createVirtualAccount({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            phoneNumber: user.phone,
            bankCodes: ['20946'] // Palmpay
        }).then(async (paymentpointResponse) => {
            if (paymentpointResponse.success) {
                const accountDetails = paymentpointResponse.accountDetails;
                if (accountDetails.bankAccounts?.[0]?.accountNumber) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            bankName: 'Palmpay (PaymentPoint)',
                            bankNo: accountDetails.bankAccounts[0].accountNumber,
                            accountReference: `PP_${user.phone}_${user.id}`
                        }
                    });
                }
            }
        }).catch(err => console.error(`Failed to auto-generate virtual account on login for ${user.email}:`, err.message));
    }

    return res.json({ token, user: { id: user.id, name: `${user.firstName} ${user.lastName}` } });
}

// POST /verify-email
router.post('/verify-email', async (req, res) => {
    try {
        const { userId, code } = req.body;
        if (!userId || !code) return res.status(400).json({ error: 'Missing userId or code' });

        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.emailVerified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        if (!user.emailVerifyCode || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
            return res.status(400).json({ error: 'Code expired or invalid. Please login again to resend.' });
        }

        if (user.emailVerifyCode !== parseInt(code)) {
            return res.status(400).json({ error: 'Incorrect verification code.' });
        }

        // Success - Update user
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, emailVerifyCode: null, emailVerifyExpiry: null }
        });

        // If they have 2FA enabled, they still need to do 2FA immediately after fixing email verification
        if (updatedUser.twoFaEnabled) {
            if (updatedUser.twoFaMethod === 'email') {
                // [SEC-HIGH-04] Use cryptographically secure OTP generator
                const otpCode = crypto.randomInt(100000, 999999);
                const expiry = new Date(Date.now() + 10 * 60 * 1000);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
                });
                const nodemailer = require('nodemailer');
                try {
                    const transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST || 'smtp.gmail.com',
                        port: process.env.SMTP_PORT || 587,
                        secure: process.env.SMTP_PORT === '465',
                        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                    });
                    await transporter.sendMail({
                        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                        to: user.email,
                        subject: 'UFriends 2FA Login',
                        html: `<p>Your 2FA login code is: <strong>${otpCode}</strong></p>`
                    });
                } catch (err) {}
            }

            return res.json({ 
                success: true, 
                twoFaRequired: true, 
                twoFaMethod: updatedUser.twoFaMethod || 'totp',
                userId: updatedUser.id,
                message: 'Two-factor authentication required.'
            });
        }

        // Finish login
        return completeLoginProcess(updatedUser, req, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /verify-2fa
router.post('/verify-2fa', async (req, res) => {
    try {
        const { userId, code } = req.body;
        if (!userId || !code) return res.status(400).json({ error: 'Missing userId or code' });

        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.twoFaMethod === 'email') {
            if (!user.emailVerifyCode || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
                return res.status(400).json({ error: 'Code expired or invalid. Please login again.' });
            }
            if (user.emailVerifyCode !== parseInt(code)) {
                return res.status(400).json({ error: 'Incorrect 2FA code.' });
            }
            // Clear the OTP fields
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerifyCode: null, emailVerifyExpiry: null }
            });
        } else if (user.twoFaMethod === 'totp') {
            const speakeasy = require('speakeasy');
            const verified = speakeasy.totp.verify({
                secret: user.twoFaSecret,
                encoding: 'base32',
                token: code,
                window: 1
            });
            if (!verified) {
                // Return 400 with general error for safety, or specific
                return res.status(400).json({ error: 'Invalid Google Authenticator code.' });
            }
        } else {
            return res.status(400).json({ error: 'Unknown 2FA method.' });
        }

        // Finish login
        return completeLoginProcess(user, req, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Profile — uses middleware for consistent blocked-account checks
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                state: true,
                type: true,
                wallet: true,
                refWallet: true,
                airtimeLimit: true,
                accountLimit: true,
                kycStatus: true,
                pinEnabled: true,
                apiKey: true,
                referralCode: true,
                twoFaEnabled: true,
                twoFaMethod: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Count referrals
        const totalReferrals = await prisma.user.count({
            where: { referredBy: user.referralCode }
        });

        const accountTypes = { 1: 'user', 2: 'agent', 3: 'vendor' };

        res.json({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone,
            state: user.state,
            accountType: accountTypes[user.type] || 'user',
            wallet: user.wallet,
            refWallet: user.refWallet,
            airtimeLimit: user.airtimeLimit || 10000,
            accountLimit: user.accountLimit || 500000,
            kycStatus: user.kycStatus || false,
            pinEnabled: user.pinEnabled || false,
            apiKey: user.type === 3 ? user.apiKey : null,
            referralCode: user.referralCode,
            twoFaEnabled: user.twoFaEnabled || false,
            twoFaMethod: user.twoFaMethod || 'totp',
            totalReferrals
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Password — uses middleware for consistent blocked-account checks
router.put('/update-password', authenticateUser, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Old and new passwords are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Incorrect old password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle PIN — uses middleware for consistent blocked-account checks
router.post('/pin/toggle', authenticateUser, async (req, res) => {
    try {
        const { action, pin, confirmPin, currentPin } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (action === 'enable') {
            if (!pin || !confirmPin) {
                return res.status(400).json({ error: 'PIN and confirmation required' });
            }

            if (pin !== confirmPin) {
                return res.status(400).json({ error: 'PINs do not match' });
            }

            if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
                return res.status(400).json({ error: 'PIN must be 4 digits' });
            }

            const hashedPin = await bcrypt.hash(pin, 10);
            await prisma.user.update({
                where: { id: req.user.id },
                data: {
                    transactionPin: hashedPin,
                    pinEnabled: true
                }
            });

            res.json({ message: 'PIN enabled successfully' });
        } else if (action === 'disable') {
            if (!currentPin) {
                return res.status(400).json({ error: 'Current PIN required' });
            }

            if (!user.transactionPin) {
                return res.status(400).json({ error: 'No PIN set' });
            }

            const validPin = await bcrypt.compare(currentPin, user.transactionPin);
            if (!validPin) {
                return res.status(400).json({ error: 'Incorrect PIN' });
            }

            await prisma.user.update({
                where: { id: req.user.id },
                data: { pinEnabled: false }
            });

            res.json({ message: 'PIN disabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change/Reset PIN while it's already enabled
router.post('/pin/reset', authenticateUser, async (req, res) => {
    try {
        const { currentPin, newPin, confirmPin } = req.body;

        if (!currentPin || !newPin || !confirmPin) {
            return res.status(400).json({ error: 'Current PIN, new PIN, and confirmation are required' });
        }

        if (newPin !== confirmPin) {
            return res.status(400).json({ error: 'New PINs do not match' });
        }

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !user.transactionPin) {
            return res.status(400).json({ error: 'No active PIN found' });
        }

        const validPin = await bcrypt.compare(currentPin, user.transactionPin);
        if (!validPin) {
            return res.status(400).json({ error: 'Incorrect current PIN' });
        }

        const hashedPin = await bcrypt.hash(newPin, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { transactionPin: hashedPin }
        });

        res.json({ message: 'Transaction PIN changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get PIN Status — uses middleware for consistent blocked-account checks  
router.post('/pin/forgot', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate OTP
        const otpCode = crypto.randomInt(100000, 999999);
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
        });

        const nodemailer = require('nodemailer');
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_PORT === '465',
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                to: user.email,
                subject: 'UFriends PIN Reset OTP',
                html: `<p>Hello ${user.firstName},</p>
                       <p>You requested to reset your transaction PIN.</p>
                       <p>Your OTP is: <strong style="font-size:24px;">${otpCode}</strong></p>
                       <p>This code expires in 10 minutes. If you did not request this, please secure your account.</p>`
            });
        } catch (err) {
            console.error("Failed to send PIN reset email", err);
            return res.status(500).json({ error: 'Failed to send OTP email' });
        }

        res.json({ message: 'OTP sent to your email successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/pin/reset-with-otp', authenticateUser, async (req, res) => {
    try {
        const { otp, newPin, confirmPin } = req.body;
        
        if (!otp || !newPin || !confirmPin) {
            return res.status(400).json({ error: 'OTP, new PIN, and confirmation are required' });
        }

        if (newPin !== confirmPin) {
            return res.status(400).json({ error: 'New PINs do not match' });
        }

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (!user.emailVerifyCode || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
            return res.status(400).json({ error: 'OTP expired or invalid. Please request a new one.' });
        }

        if (user.emailVerifyCode.toString() !== otp.toString()) {
            return res.status(400).json({ error: 'Incorrect OTP.' });
        }

        const hashedPin = await bcrypt.hash(newPin, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { 
                transactionPin: hashedPin,
                pinEnabled: true,
                emailVerifyCode: null,
                emailVerifyExpiry: null
            }
        });

        res.json({ message: 'Transaction PIN reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get PIN Status — uses middleware for consistent blocked-account checks  
router.get('/pin/status', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { pinEnabled: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ pinEnabled: user.pinEnabled || false });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await prisma.user.findUnique({ where: { email } });

        // Security: always return the same generic message when user is not found
        // to prevent email enumeration attacks.
        if (!user) {
            return res.json({ message: 'Password reset link has been sent to your email if you have an account.' });
        }

        // Build a one-time token — signing it with the user's current password hash
        // means the token auto-invalidates the moment the password is successfully changed.
        const secret = process.env.JWT_SECRET + user.password;
        const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '5m' });

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}&id=${user.id}`;

        const { sendEmailStrict } = require('../services/email.service');
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #004687; margin: 0;">Password Reset Request</h2>
                </div>
                <p style="color: #374151;">Hello <strong>${user.firstName}</strong>,</p>
                <p style="color: #374151;">You requested to reset your Ufriends account password. Click the button below to choose a new password.</p>
                <p style="color: #6b7280; font-size: 13px;">This link expires in <strong>5 minutes</strong> and can only be used once.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #004687, #1E90FF); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                        Reset My Password
                    </a>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
            </div>
        `;

        // Use strict send — awaits actual SMTP delivery and throws on failure
        await sendEmailStrict(user.email, 'Password Reset Request – Ufriends', html);

        res.json({ message: 'Password reset link has been sent to your email if you have an account.' });
    } catch (error) {
        console.error('Forgot password error:', error);

        // Distinguish SMTP/config errors from other server errors
        if (error.message === 'EMAIL_NOT_CONFIGURED') {
            return res.status(503).json({
                error: 'EMAIL_UNAVAILABLE',
                message: 'Our email service is currently unavailable. Please try again later or contact support.'
            });
        }

        // SMTP delivery failure (wrong credentials, network issue, etc.)
        return res.status(503).json({
            error: 'EMAIL_SEND_FAILED',
            message: 'We could not deliver the email at this time. Please try again in a moment.'
        });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { id, token, newPassword } = req.body;

        if (!id || !token || !newPassword) {
            return res.status(400).json({ error: 'Invalid request parameters' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const secret = process.env.JWT_SECRET + user.password;
        
        try {
            jwt.verify(token, secret);
        } catch (err) {
            // Token is expired or password was already changed (secret changed)
            return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new one.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate / Regenerate API Key
router.post('/generate-api-key', authenticateUser, async (req, res) => {
    try {
        // Re-check user to ensure they are a vendor (type === 3)
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user || user.type !== 3) {
            return res.status(403).json({ error: 'Only vendors can generate API keys.' });
        }

        const crypto = require('crypto');
        const newApiKey = crypto.randomBytes(32).toString('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: { apiKey: newApiKey }
        });

        res.json({ message: 'API Key generated successfully', apiKey: newApiKey });
    } catch (error) {
        console.error('API Key generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
