const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const adminAuth = require('../middleware/adminAuth');

// Definition of roles (can be moved to constants)
const ROLES = {
    SUPER_ADMIN: 1,
    ADMIN: 2,
    SUPPORT: 3
};

// Schema for creating/updating admin users
const adminUserSchema = z.object({
    name: z.string().min(2),
    username: z.string().min(3),
    password: z.string().min(6).optional(), // Optional for update
    role: z.number().int().min(1).max(3),
    pinToken: z.string().length(4).optional().or(z.literal('')),
    status: z.number().int().default(1) // 1 = Active, 0 = Inactive
});

// Middleware to check for Super Admin role
const superAdminOnly = async (req, res, next) => {
    if (req.admin.role !== ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }
    next();
};

// GET /api/admin/system-users - List all admin users
router.get('/', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const users = await prisma.adminUser.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                status: true,
                createdAt: true,
                lastLoginAt: true // Assuming exists or add to select
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Fetch system users error:', error);
        res.status(500).json({ error: 'Failed to fetch system users' });
    }
});

// POST /api/admin/system-users - Create new admin
router.post('/', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const data = adminUserSchema.parse(req.body);

        if (!data.password) {
            return res.status(400).json({ error: 'Password is required for new users' });
        }

        const existing = await prisma.adminUser.findUnique({
            where: { username: data.username }
        });

        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const newUser = await prisma.adminUser.create({
            data: {
                name: data.name,
                username: data.username,
                password: hashedPassword,
                role: data.role,
                status: data.status,
                pinToken: data.pinToken || null
            },
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                status: true,
                createdAt: true
            }
        });

        res.json({ success: true, message: 'Admin user created successfully', user: newUser });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(400).json({ error: error.message || 'Failed to create admin user' });
    }
});

// PUT /api/admin/system-users/:id - Update admin user
router.put('/:id', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const data = adminUserSchema.parse(req.body);

        const updateData = {
            name: data.name,
            username: data.username,
            role: data.role,
            status: data.status
        };

        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        if (data.pinToken) {
            updateData.pinToken = data.pinToken;
        }

        const updatedUser = await prisma.adminUser.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                name: true,
                username: true,
                role: true,
                status: true
            }
        });

        res.json({ success: true, message: 'Admin user updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Update admin error:', error);
        res.status(400).json({ error: 'Failed to update admin user' });
    }
});

// DELETE /api/admin/system-users/:id - Delete admin user
router.delete('/:id', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting self
        if (parseInt(id) === req.admin.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await prisma.adminUser.delete({
            where: { id: parseInt(id) }
        });

        res.json({ success: true, message: 'Admin user deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(400).json({ error: 'Failed to delete admin user' });
    }
});

// PUT /api/admin/system-users/:id/toggle-status - Toggle status
router.put('/:id/toggle-status', adminAuth, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.adminUser.findUnique({ where: { id: parseInt(id) } });

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (parseInt(id) === req.admin.id) return res.status(400).json({ error: 'Cannot change your own status' });

        const newStatus = user.status === 1 ? 0 : 1;

        await prisma.adminUser.update({
            where: { id: parseInt(id) },
            data: { status: newStatus }
        });

        res.json({ success: true, message: `User ${newStatus === 1 ? 'activated' : 'deactivated'}`, status: newStatus });
    } catch (error) {
        res.status(400).json({ error: 'Failed to toggle status' });
    }
});

module.exports = router;
