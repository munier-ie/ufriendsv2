const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const crypto = require('crypto');
const authenticateUser = require('../middleware/auth');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Setup 2FA (TOTP)
router.post('/setup', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user.twoFaEnabled) return res.status(400).json({ error: '2FA is already enabled.' });

        const temp_secret = speakeasy.generateSecret({ length: 20, name: `UFriends (${user.email})` });

        await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFaSecret: temp_secret.base32 }
        });

        QRCode.toDataURL(temp_secret.otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: 'Error generating QR code' });
            res.json({
                success: true,
                qrCode: data_url,
                tempToken: temp_secret.base32
            });
        });
    } catch (error) {
        console.error('Setup 2FA error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify and Enable 2FA
router.post('/enable', authenticateUser, async (req, res) => {
    try {
        const { code, tempToken, method = 'totp' } = req.body;
        if (!code) return res.status(400).json({ error: 'Verification code is required' });

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        
        if (method === 'totp') {
            const secret = tempToken || user.twoFaSecret;
            if (!secret) return res.status(400).json({ error: 'Please generate a secret first' });

            const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: code,
                window: 1
            });
            if (!verified) return res.status(400).json({ error: 'Invalid authenticator code' });

            await prisma.user.update({
                where: { id: req.user.id },
                data: { twoFaEnabled: true, twoFaMethod: 'totp', twoFaSecret: secret }
            });
        } else if (method === 'email') {
            // Verify OTP sent to email during setup-email path
            if (!user.emailVerifyCode || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
                return res.status(400).json({ error: 'Code expired or invalid.' });
            }
            if (user.emailVerifyCode !== parseInt(code)) {
                return res.status(400).json({ error: 'Incorrect verification code.' });
            }
            await prisma.user.update({
                where: { id: req.user.id },
                data: { twoFaEnabled: true, twoFaMethod: 'email', emailVerifyCode: null, emailVerifyExpiry: null }
            });
        }

        res.json({ success: true, message: '2FA enabled successfully!' });
    } catch (error) {
        console.error('Enable 2FA error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Setup Email 2FA (Send OTP)
router.post('/setup-email', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        // [SEC-HIGH-04] Use cryptographically secure OTP generator
        const otpCode = crypto.randomInt(100000, 999999);
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await prisma.user.update({
            where: { id: req.user.id },
            data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
        });

        const { send2FaOtpEmail } = require('../services/email.service');
        await send2FaOtpEmail(user, otpCode, false);

        res.json({ success: true, message: 'OTP sent to your email.' });
    } catch (error) {
        console.error('Setup Email 2FA error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Disable 2FA
router.post('/disable', authenticateUser, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Verification code is required' });

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        
        if (user.twoFaMethod === 'totp') {
            const verified = speakeasy.totp.verify({
                secret: user.twoFaSecret,
                encoding: 'base32',
                token: code,
                window: 1
            });
            if (!verified) return res.status(400).json({ error: 'Invalid authenticator code' });
        } else if (user.twoFaMethod === 'email') {
            // [SEC-MED-05] Email 2FA disable requires OTP re-confirmation to prevent session-hijack bypass
            if (!user.emailVerifyCode || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
                return res.status(400).json({ error: 'OTP required. Please use the setup-email endpoint to send a new code.' });
            }
            if (user.emailVerifyCode !== parseInt(code)) {
                return res.status(400).json({ error: 'Incorrect verification code.' });
            }
            // Clear OTP after verification
            await prisma.user.update({
                where: { id: req.user.id },
                data: { emailVerifyCode: null, emailVerifyExpiry: null }
            });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFaEnabled: false, twoFaSecret: null, twoFaMethod: null }
        });

        res.json({ success: true, message: '2FA disabled successfully!' });
    } catch (error) {
        console.error('Disable 2FA error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get 2FA Status
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        res.json({
            enabled: user.twoFaEnabled,
            method: user.twoFaMethod
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
