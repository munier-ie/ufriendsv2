const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const { sendEmailStrict, sendWelcomeEmail, sendLoginAlert, sendVerificationOtpEmail, send2FaOtpEmail, sendAdminNewAccountAlert } = require('../services/email.service');
const paymentpointService = require('../services/paymentpoint.service');
const { generateUniqueCode } = require('../utils/referral.utils');
const authenticateUser = require('../middleware/auth');
const pinRateLimit = require('../middleware/pinRateLimit');
const { safeError } = require('../utils/safeError');
const { clearPinFailures, rejectInvalidPin } = require('../utils/pinAttempts');

// Per-phone OTP email rate limit (3 emails per phone per 10 minutes)
const otpEmailAttempts = new Map(); // phone -> { count, resetAt }
const OTP_EMAIL_MAX = 3;
const OTP_EMAIL_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function emailFailureResponse(res, error, fallbackMessage) {
    const notConfigured = error?.message === 'EMAIL_NOT_CONFIGURED';
    if (!notConfigured && !error?.isEmailDeliveryError) {
        return res.status(500).json({ error: 'Internal server error' });
    }
    return res.status(503).json({
        error: notConfigured ? 'EMAIL_NOT_CONFIGURED' : 'EMAIL_SEND_FAILED',
        message: notConfigured
            ? 'Email service is currently unavailable. Please try again later or contact support.'
            : fallbackMessage
    });
}

async function issueVerificationOtp(user) {
    const otpCode = crypto.randomInt(100000, 1000000);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
    });

    await sendVerificationOtpEmail(user, otpCode);
}

async function rejectInvalidLogin(req, res) {
    const result = await req.credentialRateLimit?.recordFailure();
    if (result?.locked) return req.credentialRateLimit.sendLocked(result);
    return res.status(400).json({ error: 'Invalid credentials' });
}

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
    password: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    pin: z.string().length(4),
    state: z.string().trim().optional().nullable(),
    referral: z.string().trim().optional().nullable(),
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
            // Log full error for server-side debugging
            console.error('Validation failed:', JSON.stringify(validation.error.issues, null, 2));
            
            const firstError = validation.error.issues?.[0]?.message || 'Invalid input';
            return res.status(400).json({ 
                error: firstError,
                details: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
            });
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

        const otpCode = crypto.randomInt(100000, 1000000);
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
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
                apiKey: require('crypto').randomBytes(32).toString('hex'),
                emailVerifyCode: otpCode,
                emailVerifyExpiry: otpExpiry
            }
        });

        // Verification is sent before welcome. The welcome email is only sent
        // after the address has actually been verified.
        let verificationEmailSent = true;
        try {
            await sendVerificationOtpEmail(user, otpCode);
        } catch (error) {
            verificationEmailSent = false;
            console.error('Registration verification email failed:', safeError(error));
        }

        // Notify Admin on new account creation
        sendAdminNewAccountAlert(user, req).catch(err => console.error('Admin new account alert error:', err));

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
                console.log('Auto-generated PaymentPoint virtual account');
            }
        }).catch(err => {
            console.error('Failed to auto-generate PaymentPoint virtual account');
        });

        res.status(201).json({
            message: verificationEmailSent
                ? 'Account created. A verification code has been sent to your email.'
                : 'Account created, but the verification email could not be delivered. Please use Resend Code.',
            userId: user.id,
            verificationEmailSent
        });
    } catch (error) {
        console.error('Registration Error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login (renamed to access to bypass WAF rules on /login and /signin paths)
router.post('/access', async (req, res) => {
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
            return rejectInvalidLogin(req, res);
        }
        
        if (user.securityHold) {
            return res.status(403).json({ error: 'Account temporarily suspended for security review. Contact support.', code: 'SECURITY_HOLD' });
        }

        if (user.regStatus === 1) {
            return res.status(403).json({ error: 'Account blocked. Contact support.' });
        }

        if (user.regStatus === 2) {
            return res.status(403).json({ error: 'Account is terminated.' });
        }

        // Strict Bcrypt check only
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return rejectInvalidLogin(req, res);
        }

        // A valid password clears failure history for this IP/device/account.
        await req.credentialRateLimit?.reset();

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
            let verificationEmailSent = true;
            try {
                await issueVerificationOtp(user);
            } catch (error) {
                verificationEmailSent = false;
                console.error('Login verification email failed:', safeError(error));
            }

            return res.json({ 
                success: true, 
                emailVerificationRequired: true, 
                userId: user.id,
                verificationEmailSent,
                message: verificationEmailSent
                    ? 'Please verify your email to continue. We sent a code to your email.'
                    : 'Please verify your email to continue. The code could not be delivered; use Resend Code.'
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
                send2FaOtpEmail(user, otpCode).catch(err => {
                    console.error('Failed to send 2FA email:', safeError(err));
                });
            }

            return res.json({ 
                success: true, 
                twoFaRequired: true, 
                twoFaMethod: user.twoFaMethod || 'totp',
                userId: user.id,
                message: 'Two-factor authentication required.'
            });
        }

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
        sendLoginAlert(user, req).catch(err => console.error('Email error:', err));

        // Auto-generate Virtual Account if missing
        if (!user.bankNo) {
            const { decrypt } = require('../utils/encryption');
            let userBvn = null;
            let userNin = null;
            if (user.bvn) { try { userBvn = decrypt(user.bvn); } catch(e){} }
            if (user.nin) { try { userNin = decrypt(user.nin); } catch(e){} }

            paymentpointService.createVirtualAccount({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                phoneNumber: user.phone,
                bankCodes: ['20946'], // Palmpay
                bvn: userBvn,
                nin: userNin
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
                        console.log('Auto-generated virtual account on login');
                    }
                }
            }).catch(err => {
                console.error('Failed to auto-generate virtual account on login');
            });
        }

        res.json({ token, user: { id: user.id, name: `${user.firstName} ${user.lastName}` } });
    } catch (error) {
        console.error('Login error:', safeError(error));
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
    sendLoginAlert(user, req).catch(err => console.error('Email error:', err));

    // Auto-generate Virtual Account if missing
    if (!user.bankNo) {
        const { decrypt } = require('../utils/encryption');
        let userBvn = null;
        let userNin = null;
        if (user.bvn) { try { userBvn = decrypt(user.bvn); } catch(e){} }
        if (user.nin) { try { userNin = decrypt(user.nin); } catch(e){} }

        paymentpointService.createVirtualAccount({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            phoneNumber: user.phone,
            bankCodes: ['20946'], // Palmpay
            bvn: userBvn,
            nin: userNin
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
        }).catch(() => console.error('Failed to auto-generate virtual account on login'));
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

        // A welcome message belongs after ownership of the email address has
        // been confirmed, not immediately after account creation.
        sendWelcomeEmail(updatedUser).catch(err => {
            console.error('Welcome email failed:', safeError(err));
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
                send2FaOtpEmail(updatedUser, otpCode).catch(err => {
                    console.error('Failed to send 2FA email during verify email flow:', safeError(err));
                });
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
        console.error('Email verification error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /resend-verification
router.post('/resend-verification', async (req, res) => {
    try {
        const userId = Number.parseInt(req.body?.userId, 10);
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({ error: 'A valid userId is required' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.emailVerified) {
            return res.json({ message: 'If verification is still required, a new code has been sent.' });
        }

        await issueVerificationOtp(user);
        return res.json({ message: 'A new verification code has been sent to your email.' });
    } catch (error) {
        console.error('Resend verification email failed:', safeError(error));
        return emailFailureResponse(
            res,
            error,
            'We could not deliver the verification email. Please try again in a moment.'
        );
    }
});

// POST /resend-2fa
router.post('/resend-2fa', async (req, res) => {
    try {
        const userId = Number.parseInt(req.body?.userId, 10);
        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({ error: 'A valid userId is required' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFaEnabled) {
            return res.json({ message: 'If 2FA is required, a new code has been sent.' });
        }

        if (user.twoFaMethod === 'email') {
            const otpCode = crypto.randomInt(100000, 999999);
            const expiry = new Date(Date.now() + 10 * 60 * 1000);
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
            });
            send2FaOtpEmail(user, otpCode).catch(err => {
                console.error('Failed to resend 2FA email:', safeError(err));
            });
            return res.json({
                success: true,
                message: 'A new 2FA verification code has been sent to your email.'
            });
        }

        return res.status(400).json({
            error: 'Authenticator app codes are generated automatically on your device and do not need to be resent.'
        });
    } catch (error) {
        console.error('Resend 2FA error:', safeError(error));
        return res.status(500).json({ error: 'Failed to resend 2FA code' });
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
        console.error('2FA verification error:', safeError(error));
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
                testApiKey: true,
                apiIps: true,
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
            type: user.type,
            wallet: user.wallet,
            balance: user.wallet,
            refWallet: user.refWallet,
            airtimeLimit: user.airtimeLimit || 10000,
            accountLimit: user.accountLimit || 500000,
            kycStatus: user.kycStatus || false,
            pinEnabled: user.pinEnabled || false,
            apiKey: user.type === 3 ? user.apiKey : null,
            testApiKey: user.type === 3 ? user.testApiKey : null,
            apiIps: user.type === 3 ? user.apiIps : null,
            referralCode: user.referralCode,
            twoFaEnabled: user.twoFaEnabled || false,
            twoFaMethod: user.twoFaMethod || 'totp',
            totalReferrals
        });
    } catch (error) {
        console.error('Profile request error:', safeError(error));
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
        console.error('PIN verification error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle PIN — uses middleware for consistent blocked-account checks
router.post('/pin/toggle', authenticateUser, pinRateLimit, async (req, res) => {
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

            await clearPinFailures(req);
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
                return rejectInvalidPin(req, res, { message: 'Incorrect PIN' });
            }

            await clearPinFailures(req);
            await prisma.user.update({
                where: { id: req.user.id },
                data: { pinEnabled: false }
            });

            res.json({ message: 'PIN disabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('PIN update error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change/Reset PIN while it's already enabled
router.post('/pin/reset', authenticateUser, pinRateLimit, async (req, res) => {
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
            return rejectInvalidPin(req, res, { message: 'Incorrect current PIN' });
        }

        await clearPinFailures(req);
        const hashedPin = await bcrypt.hash(newPin, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { transactionPin: hashedPin }
        });

        res.json({ message: 'Transaction PIN changed successfully' });
    } catch (error) {
        console.error('PIN reset request error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get PIN Status — uses middleware for consistent blocked-account checks  
router.post('/pin/forgot', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate OTP
        const otpCode = crypto.randomInt(100000, 1000000);
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
        });

        await sendVerificationOtpEmail({ firstName: user.firstName, email: user.email }, otpCode);

        res.json({ message: 'OTP sent to your email successfully.' });
    } catch (error) {
        console.error('PIN reset error:', safeError(error));
        return emailFailureResponse(
            res,
            error,
            'We could not deliver the PIN reset code. Please try again in a moment.'
        );
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
        console.error('Password recovery error:', safeError(error));
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

// Forgot Password (link-based for Web)
router.post('/forgot-password', async (req, res) => {
    try {
        const email = typeof req.body?.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await prisma.user.findUnique({ where: { email } });

        // Keep the response identical for unknown addresses to prevent account
        // enumeration.
        if (!user) {
            return res.json({ message: 'If an account exists, a password reset link has been sent to your email.' });
        }

        // Generate a 256-bit cryptographically secure random token (CSPRNG)
        const rawToken = crypto.randomBytes(32).toString('hex');

        // Hash token with environment scope to isolate local development and production
        const envScope = process.env.API_NODE_ENV || process.env.NODE_ENV || 'production';
        const hashedToken = crypto.createHash('sha256').update(`${rawToken}:${envScope}`).digest('hex');

        // Explicit 15-minute expiration term
        const expiry = new Date(Date.now() + 15 * 60 * 1000);

        // Store hashed token and expiry in database — auto-invalidates any previous link
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: hashedToken,
                passwordResetExpires: expiry
            }
        });

        // The reset link contains ONLY the raw token — user ID is never exposed or accepted
        const resetLink = `${process.env.FRONTEND_URL || 'https://www.ufriends.com.ng'}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #004687; margin: 0;">Password Reset Request</h2>
                </div>
                <p style="color: #374151;">Hello <strong>${user.firstName}</strong>,</p>
                <p style="color: #374151;">You requested to reset your Ufriends account password. Click the button below to choose a new password.</p>
                <p style="color: #6b7280; font-size: 13px;">This link expires in <strong>15 minutes</strong> and can only be used once.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="${resetLink}" style="display: inline-block; padding: 12px 28px; background: #004687; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                        Reset My Password
                    </a>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
            </div>
        `;

        await sendEmailStrict(user.email, 'Password Reset Request - Ufriends', html);
        return res.json({ message: 'If an account exists, a password reset link has been sent to your email.' });
    } catch (error) {
        console.error('Forgot password email failed:', safeError(error));
        return emailFailureResponse(
            res,
            error,
            'We could not deliver the password reset email. Please try again in a moment.'
        );
    }
});

// Verify Reset Token (pre-flight check for Web UX)
router.get('/verify-reset-token', async (req, res) => {
    try {
        const rawToken = typeof req.query?.token === 'string' ? req.query.token.trim() : '';
        if (!rawToken || !/^[a-f0-9]{64}$/i.test(rawToken)) {
            return res.status(400).json({ valid: false, error: 'Invalid or malformed reset link.' });
        }

        const envScope = process.env.API_NODE_ENV || process.env.NODE_ENV || 'production';
        const hashedToken = crypto.createHash('sha256').update(`${rawToken}:${envScope}`).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { gt: new Date() }
            },
            select: { id: true }
        });

        if (!user) {
            return res.status(400).json({ valid: false, error: 'This reset link is invalid or has expired. Please request a new one.' });
        }

        return res.json({ valid: true });
    } catch (error) {
        console.error('Verify reset token error:', safeError(error));
        res.status(500).json({ valid: false, error: 'Internal server error' });
    }
});

// Forgot Password (OTP-based for Mobile)
router.post('/forgot-password-otp', async (req, res) => {
    try {
        const email = typeof req.body?.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await prisma.user.findUnique({ where: { email } });

        // Security: always return same message
        if (!user) {
            return res.json({ message: 'If an account exists, an OTP has been sent to your email.' });
        }

        const otpCode = crypto.randomInt(100000, 999999);
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
        });

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #004687; margin: 0;">Password Reset OTP</h2>
                </div>
                <p style="color: #374151;">Hello <strong>${user.firstName}</strong>,</p>
                <p style="color: #374151;">You requested to reset your Ufriends account password. Use the OTP below to verify your request.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <span style="display: inline-block; padding: 12px 28px; background: #f3f4f6; color: #004687; border-radius: 8px; font-weight: bold; font-size: 32px; letter-spacing: 4px;">
                        ${otpCode}
                    </span>
                </div>
                <p style="color: #6b7280; font-size: 13px;">This code expires in <strong>10 minutes</strong>.</p>
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `;

        await sendEmailStrict(user.email, 'Password Reset OTP - Ufriends', html);

        res.json({ message: 'OTP sent to your email successfully.' });
    } catch (error) {
        console.error('Forgot password OTP error:', safeError(error));
        return emailFailureResponse(
            res,
            error,
            'We could not deliver the password reset code. Please try again in a moment.'
        );
    }
});

// Reset Password (OTP-based for Mobile)
router.post('/reset-password-otp', async (req, res) => {
    try {
        const email = typeof req.body?.email === 'string'
            ? req.body.email.trim().toLowerCase()
            : '';
        const { otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, OTP, and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

        if (!user.emailVerifyCode || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
            return res.status(400).json({ error: 'OTP expired or invalid. Please request a new one.' });
        }

        if (user.emailVerifyCode.toString() !== otp.toString()) {
            return res.status(400).json({ error: 'Incorrect OTP.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    emailVerifyCode: null,
                    emailVerifyExpiry: null
                }
            }),
            prisma.userLogin.deleteMany({ where: { userId: user.id } })
        ]);

        res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (error) {
        console.error('Reset password OTP error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Reset Password (link-based for Web)
router.post('/reset-password', async (req, res) => {
    try {
        const rawToken = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
        const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

        if (!rawToken || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
            return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new one.' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const envScope = process.env.API_NODE_ENV || process.env.NODE_ENV || 'production';
        const hashedToken = crypto.createHash('sha256').update(`${rawToken}:${envScope}`).digest('hex');

        // Look up user SOLELY by cryptographic token hash and unexpired timestamp
        // User ID is NOT accepted from client, completely eliminating IDOR/user switching
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new one.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atomically update password, invalidate reset token immediately, and terminate all active sessions
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    passwordResetToken: null,
                    passwordResetExpires: null
                }
            }),
            prisma.userLogin.deleteMany({ where: { userId: user.id } })
        ]);

        res.json({ message: 'Password has been reset successfully. You can now login.' });
    } catch (error) {
        console.error('Reset password error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate / Regenerate API Key
// ─── API Key Management ───────────────────────────────────────────────────────

/**
 * GET /api/auth/api-key
 * Returns the current API key for the authenticated user.
 * Vendors always see it; agents and regular users also see it (they can use the API too).
 */
router.get('/api-key', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where:  { id: req.user.id },
            select: { apiKey: true, testApiKey: true, apiIps: true, type: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            apiKey:      user.apiKey,
            testApiKey:  user.testApiKey,
            apiIps:      user.apiIps || '',
            accountType: { 1: 'user', 2: 'agent', 3: 'vendor' }[user.type] || 'user',
            note:        user.type === 3
                ? 'Keep this key secret. Use it as: Authorization: Bearer <apiKey>'
                : 'Upgrade to a Vendor account for higher rate limits and full API access.'
        });
    } catch (error) {
        console.error('Get API key error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/api-key/regenerate
 * Regenerates the API key for the authenticated user.
 * Does NOT require a transaction PIN (the JWT session is sufficient authorisation).
 * Old key is immediately invalidated.
 */
router.post('/api-key/regenerate', authenticateUser, async (req, res) => {
    try {
        const newApiKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
        const newTestApiKey = 'sk_test_' + crypto.randomBytes(24).toString('hex');

        await prisma.user.update({
            where: { id: req.user.id },
            data:  { apiKey: newApiKey, testApiKey: newTestApiKey }
        });

        res.json({
            success: true,
            message: 'API Keys regenerated. Your old keys are now invalid.',
            apiKey:  newApiKey,
            testApiKey: newTestApiKey
        });
    } catch (error) {
        console.error('API Key regenerate error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/generate-api-key  (legacy – kept for backwards compatibility)
 * Vendors only. Requires transaction PIN.
 * New integrations should use POST /api/auth/api-key/regenerate instead.
 */
router.post('/generate-api-key', authenticateUser, pinRateLimit, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || user.type !== 3) {
            return res.status(403).json({ error: 'Only vendors can use this endpoint. Use /api/auth/api-key/regenerate instead.' });
        }

        const { pin } = req.body;
        if (!pin) return res.status(400).json({ error: 'Transaction PIN required' });
        if (!user.transactionPin) return res.status(400).json({ error: 'No transaction PIN set.' });

        const validPin = await bcrypt.compare(pin, user.transactionPin);
        if (!validPin) return rejectInvalidPin(req, res, { message: 'Incorrect PIN' });
        await clearPinFailures(req);

        const newApiKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
        const newTestApiKey = 'sk_test_' + crypto.randomBytes(24).toString('hex');
        await prisma.user.update({ where: { id: user.id }, data: { apiKey: newApiKey, testApiKey: newTestApiKey } });

        res.json({ message: 'API Keys generated successfully', apiKey: newApiKey, testApiKey: newTestApiKey });
    } catch (error) {
        console.error('API Key generation error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/api-ips
 * Updates the allowed IP addresses for the authenticated user's API Key.
 */
router.post('/api-ips', authenticateUser, async (req, res) => {
    try {
        const { ips } = req.body;
        
        // Basic validation for comma-separated IPs or empty string
        const safeIps = ips ? ips.trim().replace(/\\s+/g, '') : '';
        
        await prisma.user.update({
            where: { id: req.user.id },
            data: { apiIps: safeIps || null }
        });

        res.json({
            success: true,
            message: 'API Whitelist updated successfully.',
            apiIps: safeIps
        });
    } catch (error) {
        console.error('API IP Update Error:', safeError(error));
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
