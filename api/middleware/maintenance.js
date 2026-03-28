const settingsService = require('../services/settings.service');

const maintenanceMiddleware = async (req, res, next) => {
    try {
        // Only block users, not admins
        // Admin routes are prefixed with /api/admin
        if (req.originalUrl.startsWith('/api/admin')) {
            return next();
        }

        const isMaintenance = await settingsService.isMaintenanceMode();
        
        if (isMaintenance) {
            return res.status(503).json({
                error: 'MAINTENANCE_MODE',
                message: 'The system is currently undergoing scheduled maintenance. Please check back later.'
            });
        }

        next();
    } catch (error) {
        console.error('Maintenance middleware error:', error);
        next(); // Proceed anyway if settings check fails to avoid blocking site
    }
};

module.exports = maintenanceMiddleware;
