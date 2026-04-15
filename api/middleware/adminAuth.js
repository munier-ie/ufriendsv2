const jwt = require('jsonwebtoken');
const prisma = require('../../prisma/client'); // [SEC] Use shared singleton — avoids connection pool leak

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

        // [SEC-HIGH-01] Check token issue time against last logic update
        // If the admin's record was updated after the token was issued, invalidate it.
        // This ensures blocked admins, password changes, or role changes instantly revoke existing JWTs.
        if (decoded.iat && admin.updatedAt) {
            const tokenIssuedAt = decoded.iat * 1000;
            const lastUpdatedAt = new Date(admin.updatedAt).getTime();
            // Allow 5 second leeway for slow DB writes during login or minor rapid updates
            if (tokenIssuedAt < (lastUpdatedAt - 5000)) {
                return res.status(401).json({ success: false, error: 'Session expired due to securing update. Please log in again.' });
            }
        }

        // Check if admin is blocked (status 0 = Blocked, 1 = Active)
        if (admin.status === 0) {
            return res.status(403).json({ success: false, error: 'Account blocked' });
        }

        // [SEC-HIGH-03] Admin module permission mapping — allow-list model for non-super-admins
        // req.originalUrl example: /api/admin/users/123 → moduleName = 'users'
        const moduleName = req.originalUrl.split('/')[3]?.split('?')[0];

        const OPEN_MODULES = new Set(['stats', 'login', 'auth', 'me', 'activity', 'notification']);

        if (admin.role !== 1) { // Not Super Admin: enforce explicit allow-list
            if (moduleName && !OPEN_MODULES.has(moduleName)) {
                const permissions = admin.permissions;
                // Allow-list: permissions must be a non-empty object and have this module explicitly set to true
                if (!permissions || typeof permissions !== 'object' || permissions[moduleName] !== true) {
                    return res.status(403).json({ success: false, error: 'Access denied to this module' });
                }
            }
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
