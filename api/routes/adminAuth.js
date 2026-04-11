const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const adminAuthMiddleware = require('../middleware/adminAuth');

const prisma = new PrismaClient();

// Admin login schema
const adminLoginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    pin: z.string().optional()
});

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password, pin } = adminLoginSchema.parse(req.body);

        // Find admin user
        const admin = await prisma.adminUser.findUnique({
            where: { username }
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if account is blocked (status 0 = Blocked/Inactive, status 1 = Active)
        if (admin.status === 0) {
            return res.status(403).json({
                success: false,
                error: 'Account is blocked. Contact system administrator.'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if PIN is required
        if (admin.pinStatus === 1 && !pin) {
            return res.status(400).json({
                success: false,
                error: 'PIN required',
                pinRequired: true
            });
        }

        // Verify PIN if provided and required
        if (admin.pinStatus === 1 && pin) {
            const validPin = await bcrypt.compare(pin, admin.pinToken);
            if (!validPin) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid PIN'
                });
            }
        }

        // 2FA Check
        if (admin.twoFaEnabled) {
            if (admin.twoFaMethod === 'email') {
                const otpCode = Math.floor(100000 + Math.random() * 900000);
                const expiry = new Date(Date.now() + 10 * 60 * 1000);
                await prisma.adminUser.update({
                    where: { id: admin.id },
                    data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
                });
                const { send2FaOtpEmail } = require('../services/email.service');
                // Use a mock or real email sending
                const adminEmail = admin.username.includes('@') ? admin.username : process.env.ADMIN_EMAIL;
                if (adminEmail) {
                    await send2FaOtpEmail({ firstName: admin.name, email: adminEmail }, otpCode, true);
                }
            }

            return res.json({
                success: true,
                twoFaRequired: true,
                twoFaMethod: admin.twoFaMethod || 'totp',
                adminId: admin.id,
                message: admin.twoFaMethod === 'email' ? 'A verification code has been sent to your email.' : 'Two-factor authentication required.'
            });
        }

        // Verify PIN if provided and required
        if (admin.pinStatus === 1 && pin) {
            const validPin = await bcrypt.compare(pin, admin.pinToken);
            if (!validPin) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid PIN'
                });
            }
        }

        // Generate JWT token for normal login
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            admin: { id: admin.id, name: admin.name, username: admin.username, role: admin.role }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: error.errors[0].message });
        }
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /verify-2fa
router.post('/verify-2fa', async (req, res) => {
    try {
        const { adminId, code } = req.body;
        if (!adminId || !code) return res.status(400).json({ error: 'Missing adminId or code' });

        const admin = await prisma.adminUser.findUnique({ where: { id: parseInt(adminId) } });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        if (admin.twoFaMethod === 'totp') {
            const speakeasy = require('speakeasy');
            const verified = speakeasy.totp.verify({
                secret: admin.twoFaSecret,
                encoding: 'base32',
                token: code,
                window: 1
            });
            if (!verified) return res.status(400).json({ error: 'Invalid Authenticator code.' });
        } else if (admin.twoFaMethod === 'email') {
            if (!admin.emailVerifyCode || !admin.emailVerifyExpiry || admin.emailVerifyExpiry < new Date()) {
                return res.status(400).json({ error: 'Code expired or invalid.' });
            }
            if (admin.emailVerifyCode !== parseInt(code)) {
                return res.status(400).json({ error: 'Incorrect verification code.' });
            }
            // Clear OTP
            await prisma.adminUser.update({ where: { id: admin.id }, data: { emailVerifyCode: null, emailVerifyExpiry: null } });
        } else {
            return res.status(400).json({ error: 'Unknown or unsupported 2FA method for Admin.' });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            admin: { id: admin.id, name: admin.name, username: admin.username, role: admin.role }
        });
    } catch (error) {
        console.error('Admin verify 2FA error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET /api/admin/auth/me - Get current admin
router.get('/me', adminAuthMiddleware, async (req, res) => {
    try {
        const admin = await prisma.adminUser.findUnique({
            where: { id: req.admin.id },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                pinStatus: true,
                createdAt: true
            }
        });
        res.json({ success: true, admin });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/admin/auth/update-password - Change password
router.put('/update-password', adminAuthMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = z.object({
            currentPassword: z.string(),
            newPassword: z.string().min(6)
        }).parse(req.body);

        const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });

        const valid = await bcrypt.compare(currentPassword, admin.password);
        if (!valid) return res.status(400).json({ error: 'Invalid current password' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.adminUser.update({
            where: { id: req.admin.id },
            data: { password: hashed }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// GET /api/admin/auth/2fa/status
router.get('/2fa/status', adminAuthMiddleware, async (req, res) => {
    try {
        const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
        res.json({ success: true, enabled: admin.twoFaEnabled, method: admin.twoFaMethod });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/auth/setup-2fa
router.post('/setup-2fa', adminAuthMiddleware, async (req, res) => {
    try {
        const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
        if (admin.twoFaEnabled) return res.status(400).json({ error: '2FA is already enabled' });

        const speakeasy = require('speakeasy');
        const QRCode = require('qrcode');

        const temp_secret = speakeasy.generateSecret({ length: 20, name: `UFriends Admin (${admin.username})` });

        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { twoFaSecret: temp_secret.base32 }
        });

        QRCode.toDataURL(temp_secret.otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: 'Error generating QR' });
            res.json({ 
                success: true, 
                qrCode: data_url,
                tempToken: temp_secret.base32 
            });
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/auth/enable-2fa
router.post('/enable-2fa', adminAuthMiddleware, async (req, res) => {
    try {
        const { code, tempToken } = req.body;
        if (!code) return res.status(400).json({ error: 'Verification code is required' });

        const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
        const secret = tempToken || admin.twoFaSecret;
        if (!secret) return res.status(400).json({ error: 'Setup 2FA first' });

        const speakeasy = require('speakeasy');
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) return res.status(400).json({ error: 'Invalid verification code' });

        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { 
                twoFaEnabled: true, 
                twoFaMethod: 'totp',
                twoFaSecret: secret // persist the secret
            }
        });
        res.json({ success: true, message: '2FA enabled successfully' });
    } catch (error) {
        console.error('2FA enable error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/auth/disable-2fa
router.post('/disable-2fa', adminAuthMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Verification code is required' });
        
        const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });

        const speakeasy = require('speakeasy');
        const verified = speakeasy.totp.verify({
            secret: admin.twoFaSecret,
            encoding: 'base32',
            token: code,
            window: 1
        });

        if (!verified) return res.status(400).json({ error: 'Invalid verification code' });

        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { twoFaEnabled: false, twoFaMethod: null, twoFaSecret: null }
        });
        res.json({ success: true, message: '2FA disabled successfully' });
    } catch (error) {
        console.error('2FA disable error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/auth/update-pin - Change PIN
router.put('/update-pin', adminAuthMiddleware, async (req, res) => {
    try {
        const { pin, enable } = z.object({
            pin: z.string().length(4),
            enable: z.boolean()
        }).parse(req.body);

        const hashed = await bcrypt.hash(pin, 10);
        await prisma.adminUser.update({
            where: { id: req.admin.id },
            data: {
                pinToken: hashed,
                pinStatus: enable ? 1 : 0
            }
        });

        res.json({ success: true, message: 'PIN updated successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to update PIN' });
    }
});

// GET /api/admin/auth/activity - Get recent actions
router.get('/activity', adminAuthMiddleware, async (req, res) => {
    try {
        const actions = await prisma.userAction.findMany({
            where: { adminId: req.admin.id },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true, email: true } } }
        });
        res.json({ success: true, actions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});


// POST /api/admin/auth/setup-email-2fa
router.post('/setup-email-2fa', adminAuthMiddleware, async (req, res) => {
    try {
        const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
        const otpCode = Math.floor(100000 + Math.random() * 900000);
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { emailVerifyCode: otpCode, emailVerifyExpiry: expiry }
        });

        const { send2FaOtpEmail } = require('../services/email.service');
        const adminEmail = admin.username.includes('@') ? admin.username : (process.env.ADMIN_EMAIL || 'admin@ufriends.com');
        await send2FaOtpEmail({ firstName: admin.name, email: adminEmail }, otpCode, false);

        res.json({ success: true, message: 'OTP sent to your email.' });
    } catch (error) {
        console.error('Email 2FA setup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/auth/enable-email-2fa
router.post('/enable-email-2fa', adminAuthMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Verification code is required' });

        const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });

        if (!admin.emailVerifyCode || !admin.emailVerifyExpiry || admin.emailVerifyExpiry < new Date()) {
            return res.status(400).json({ error: 'Code expired or invalid.' });
        }
        if (admin.emailVerifyCode !== parseInt(code)) {
            return res.status(400).json({ error: 'Incorrect verification code.' });
        }

        await prisma.adminUser.update({
            where: { id: admin.id },
            data: { twoFaEnabled: true, twoFaMethod: 'email', emailVerifyCode: null, emailVerifyExpiry: null, twoFaSecret: null }
        });

        res.json({ success: true, message: 'Email 2FA enabled successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
