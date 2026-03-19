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

        // Check if account is blocked
        if (admin.status === 1) {
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

        // Generate JWT token
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                isAdmin: true
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                username: admin.username,
                role: admin.role
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: error.errors[0].message
            });
        }
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
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
        if (!valid) return res.status(400).json({ error: 'Incorrect current password' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.adminUser.update({
            where: { id: req.admin.id },
            data: { password: hashed }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error', error);
        res.status(400).json({ error: 'Failed to update password' });
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


module.exports = router;
