const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function adminAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if it's an admin token
        if (!decoded.isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        // Find admin user
        const admin = await prisma.adminUser.findUnique({
            where: { id: decoded.id }
        });

        if (!admin) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }

        // Check if admin is blocked
        if (admin.status === 1) {
            return res.status(403).json({ success: false, error: 'Account blocked' });
        }

        // Attach admin to request
        req.admin = admin;
        next();

    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}

module.exports = adminAuth;
