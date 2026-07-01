const { RateLimiterMemory } = require('rate-limiter-flexible');
const prisma = require('../../prisma/client');

/**
 * API Key Security Middleware
 * Handles API key validation, rate limiting per user tier,
 * IP whitelisting, and security logging
 */

// Rate limiters for different account tiers
// user.type: 1 = regular user, 2 = agent, 3 = vendor
const rateLimiters = {
    1: new RateLimiterMemory({
        points:   parseInt(process.env.RATE_LIMIT_USER   || '60'),
        duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000
    }),
    2: new RateLimiterMemory({
        points:   parseInt(process.env.RATE_LIMIT_AGENT  || '120'),
        duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000
    }),
    3: new RateLimiterMemory({
        points:   parseInt(process.env.RATE_LIMIT_VENDOR || '300'),
        duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000') / 1000
    })
};

/**
 * Verify API Key and apply rate limiting
 */
const apiKeyAuth = async (req, res, next) => {
    const startTime = Date.now();

    try {
        // Get API key from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 1,
                message: 'API key required',
                errorCode: 4001
            });
        }

        const apiKey = authHeader.substring(7);

        // Find user by live API key or test API key
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { apiKey: apiKey },
                    { testApiKey: apiKey }
                ]
            }
        });

        if (!user) {
            await logApiRequest(null, req, 401, Date.now() - startTime);
            return res.status(401).json({
                status: 1,
                message: 'Invalid API key',
                errorCode: 4002
            });
        }
        
        // Determine if this is a sandbox request
        req.isTest = (apiKey === user.testApiKey);

        // Check if account is blocked (mirrors authenticateUser middleware: regStatus===1 means blocked)
        if (user.regStatus === 1) {
            await logApiRequest(user.id, req, 403, Date.now() - startTime);
            return res.status(403).json({
                status: 1,
                message: 'Account suspended. Please contact support.',
                errorCode: 4003
            });
        }

        // [SEC] Only Vendor accounts (type === 3) may use the external API
        if (user.type !== 3) {
            await logApiRequest(user.id, req, 403, Date.now() - startTime);
            return res.status(403).json({
                status:    1,
                message:   'API access is restricted to Vendor accounts. Please upgrade your account.',
                errorCode: 4031
            });
        }

        // Apply rate limiting based on account tier (user.type: 1=user, 2=agent, 3=vendor)
        const rateLimiter = rateLimiters[user.type] || rateLimiters[3];

        try {
            await rateLimiter.consume(user.id.toString());
        } catch (rateLimiterError) {
            await logApiRequest(user.id, req, 429, Date.now() - startTime);
            return res.status(429).json({
                status: 1,
                message: 'Rate limit exceeded',
                errorCode: 4029,
                retryAfter: Math.round(rateLimiterError.msBeforeNext / 1000)
            });
        }

        // IP Whitelist check
        if (user.apiIps && user.apiIps.trim() !== '') {
            const clientIp = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'];
            const allowedIps = user.apiIps.split(',').map(ip => ip.trim());
            
            if (!allowedIps.includes(clientIp)) {
                await logApiRequest(user.id, req, 403, Date.now() - startTime);
                return res.status(403).json({
                    status: 1,
                    message: 'IP address not whitelisted',
                    errorCode: 4032
                });
            }
        }

        // Attach user to request
        req.user = user;
        req.apiStartTime = startTime;

        next();

    } catch (error) {
        console.error('API Key Auth error:', error);
        res.status(500).json({
            status: 1,
            message: 'Authentication failed',
            errorCode: 5000
        });
    }
};

/**
 * Log API request after response
 */
const logApiRequest = async (userId, req, statusCode, responseTime) => {
    try {
        if (!userId) return; // Skip logging for invalid requests

        await prisma.apiLog.create({
            data: {
                userId,
                endpoint: req.path,
                method: req.method,
                statusCode,
                responseTime,
                ipAddress: req.ip || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            }
        });
    } catch (error) {
        console.error('API logging error:', error);
    }
};

/**
 * Middleware to log successful API responses
 */
const logApiResponse = (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function
    res.send = function (data) {
        // Log the request if user is attached
        if (req.user && req.apiStartTime) {
            const responseTime = Date.now() - req.apiStartTime;
            logApiRequest(req.user.id, req, res.statusCode, responseTime);
        }

        // Call original send
        originalSend.call(this, data);
    };

    next();
};

/**
 * Get rate limit info for a user tier.
 * @param {number} userType  1=user, 2=agent, 3=vendor
 */
const getRateLimitInfo = (userType) => {
    const limits = { 1: 60, 2: 120, 3: 300 };
    return {
        limit:  limits[userType] || 60,
        window: 60 // seconds
    };
};

module.exports = {
    apiKeyAuth,
    logApiResponse,
    getRateLimitInfo
};
