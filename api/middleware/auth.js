const jwt = require('jsonwebtoken');
const prisma = require('../../prisma/client');

const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        // Check active session (Single Device Login)
        // const activeSession = await prisma.userLogin.findUnique({ where: { token } });
        // if (!activeSession) return res.status(401).json({ error: 'Session expired. Logged in on another device.' });

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return res.status(401).json({ error: 'User not found' });

        if (user.regStatus === 1) return res.status(403).json({ error: 'Account blocked. Contact support.' });

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = authenticateUser;
// Export alias for compatibility with new routes
module.exports.verifyToken = authenticateUser;
