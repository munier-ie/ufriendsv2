const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { initCron } = require('./services/smartRouting.service');
const { flushAll, flushByPrefix, getStats } = require('./middleware/cacheMiddleware');
const { policies: rateLimits } = require('./middleware/rateLimit');
const { safeError } = require('./utils/safeError');

// Start smart routing bot cron jobs
initCron();

const actionLimiterMiddleware = rateLimits.action;

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const userRoutes = require('./routes/user');
const servicesRoutes = require('./routes/services');
const pinsRoutes = require('./routes/pins');
const verifyRoutes = require('./routes/verify');
const adminRoutes = require('./routes/admin');
const adminAuthRoutes = require('./routes/adminAuth');
const kycRoutes = require('./routes/kyc'); // Import KYC routes

const compression = require('compression');

const app = express();
const { requestContext } = require('./services/securityContext');
app.use(requestContext);
require('./services/securityOutbox.service').start();
const trustedProxyAddresses = (process.env.TRUSTED_PROXY_ADDRESSES || '').split(',').map(value => value.trim()).filter(Boolean);
// Only trust forwarded client IP/geo headers when the connecting proxy is explicitly allow-listed.
app.set('trust proxy', trustedProxyAddresses.length ? trustedProxyAddresses : false);
app.use(compression());

// Configure helmet to allow PDFs to render inside iframes
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "object-src": ["'self'", "data:"],
            "frame-ancestors": ["'self'", "https://www.ufriends.com.ng", "https://ufriends.com.ng", "http://localhost:5173", "http://localhost:3000"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// [SEC-HIGH-02] Strict CORS — only allow configured frontend origins (www + non-www)
const buildAllowedOrigins = () => {
    const origins = new Set([
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'https://ufriends.com.ng',
        'https://www.ufriends.com.ng',
        'https://api.ufriends.com.ng',
    ]);

    // Automatically include both www and non-www for the configured FRONTEND_URL
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl) {
        try {
            const parsed = new URL(frontendUrl);
            origins.add(parsed.origin);
            if (parsed.hostname.startsWith('www.')) {
                // www → also allow bare domain
                parsed.hostname = parsed.hostname.replace(/^www\./, '');
                origins.add(parsed.origin);
            } else {
                // bare domain → also allow www
                parsed.hostname = 'www.' + parsed.hostname;
                origins.add(parsed.origin);
            }
        } catch { /* invalid URL — skip */ }
    }

    for (const configuredOrigin of (process.env.CORS_ALLOWED_ORIGINS || '').split(',')) {
        const value = configuredOrigin.trim();
        if (!value) continue;
        try {
            origins.add(new URL(value).origin);
        } catch {
            console.warn('[CORS] Ignoring an invalid CORS_ALLOWED_ORIGINS entry');
        }
    }

    return origins;
};

const allowedOrigins = buildAllowedOrigins();
const sharedCorsOptions = {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Device-ID']
};
const firstPartyCors = cors({
    ...sharedCorsOptions,
    origin: (origin, callback) => {
        // Allow server-to-server or same-origin requests (no Origin header)
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        // Local Vite may select another port when 5173 is occupied.
        if (process.env.NODE_ENV !== 'production') {
            try {
                const parsed = new URL(origin);
                if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
                    return callback(null, true);
                }
            } catch { /* handled as a denied origin below */ }
        }
        const error = new Error('CORS origin denied');
        error.status = 403;
        error.code = 'CORS_ORIGIN_DENIED';
        callback(error);
    }
});
const developerApiCors = cors({
    ...sharedCorsOptions,
    credentials: false,
    origin: true,
});

app.use((req, res, next) => {
    if (req.path === '/api/v1' || req.path.startsWith('/api/v1/')) {
        return developerApiCors(req, res, next);
    }
    return firstPartyCors(req, res, next);
});

// [SEC-MED-04] Raw body preservation for payment gateway webhook signature verification
app.use('/api/webhooks', express.raw({ type: ['application/json', 'application/*+json', 'text/plain'] }));

app.use(express.json({ 
    limit: '1mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
    }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const authenticateUser = require('./middleware/auth');
const adminAuth = require('./middleware/adminAuth');

// Combine auth for uploads (Allow either User or Admin)
const protectedUploads = async (req, res, next) => {
    // Support iframe authentication via query token
    if (req.query.token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }

    // Since authenticateUser and adminAuth respond directly instead of throwing,
    // we need to intercept the response methods or use a custom validator.
    // However, the simplest fix is just looking for the token.
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized access to documents' });
    }

    try {
        // Just decode and check if it has isAdmin
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.isAdmin) {
            adminAuth(req, res, next);
        } else {
            authenticateUser(req, res, next);
        }
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Global Maintenance Middleware
const maintenance = require('./middleware/maintenance');
app.use(maintenance);

// Serve uploaded CAC documents (Protected)
app.use('/api/uploads/cac', protectedUploads, express.static(path.join(__dirname, '../uploads/cac')));
// Serve manual service proof uploads (Protected)
app.use('/api/uploads/manual-proof', protectedUploads, express.static(path.join(__dirname, '../uploads/manual-proof')));
// Serve manual identification document uploads (Protected)
app.use('/api/uploads/manual-ids', protectedUploads, express.static(path.join(__dirname, '../uploads/manual-ids')));
// Serve academy content uploads (Protected)
app.use('/api/uploads/academy', protectedUploads, express.static(path.join(__dirname, '../uploads/academy')));
// NIN/BVN slips are served via presigned R2 URLs — see /api/slips route
// Legacy static path removed (migrated to Cloudflare R2)


// Distributed layered limits: IP is always enforced; first-party clients also
// carry a persistent installation ID. Payment callbacks are authenticated by
// signature and excluded so a provider retry burst cannot be dropped here.
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/webhooks/')) return next();
    return rateLimits.api(req, res, next);
});

app.post('/api/auth/access',             rateLimits.userLogin, rateLimits.userLoginFailures);
app.post('/api/auth/register',           rateLimits.signup);
app.post('/api/auth/verify-email',       rateLimits.otp);
app.post('/api/auth/resend-verification', rateLimits.otp);
app.post('/api/auth/verify-2fa',         rateLimits.otp);
app.post('/api/auth/forgot-password',    rateLimits.passwordRecovery);
app.post('/api/auth/forgot-password-otp', rateLimits.passwordRecovery);
app.get('/api/auth/verify-reset-token',   rateLimits.passwordRecovery);
app.post('/api/auth/reset-password',     rateLimits.passwordRecovery);
app.post('/api/auth/reset-password-otp', rateLimits.otp);
app.post('/api/admin/auth/access',       rateLimits.adminLogin, rateLimits.adminLoginFailures);
app.post('/api/admin/auth/verify-2fa',   rateLimits.otp);

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/user', userRoutes);
app.use('/api/services', actionLimiterMiddleware, servicesRoutes);
app.use('/api/pins', pinsRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/twofa', require('./routes/twofa')); // 2FA authentication routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes); // Rate limiting applied above via specific POST interceptors
app.use('/api/kyc', kycRoutes); // KYC verification routes
app.use('/api/virtual-accounts', require('./routes/virtualAccounts')); // Virtual accounts management
app.use('/api/webhooks', require('./routes/webhooks')); // Payment gateway webhooks
app.use('/api/referrals', require('./routes/referral')); // Referral system routes
app.use('/api/airtime-cash', require('./routes/airtimeToCash')); // Airtime to Cash routes
app.use('/api/transfer', actionLimiterMiddleware, require('./routes/transfer')); // P2P Transfer routes
app.use('/api/recharge-cards', require('./routes/rechargeCards')); // Recharge Card Printing routes
app.use('/api/notifications', require('./routes/notifications')); // Notifications routes
app.use('/api/professional', require('./routes/professional')); // Professional services (NIN, BVN, CAC)
app.use('/api/slips', require('./routes/slips')); // Slip PDF streaming proxy (authenticated, anti-caching)
app.use('/api/bvn', require('./routes/bvn')); // BVN verification and reports
app.use('/api/nin', require('./routes/nin')); // NIN verification and reports
app.use('/api/admin/verification', require('./routes/adminVerification')); // Admin verification settings
app.use('/api/admin/services', require('./routes/serviceConfig')); // Admin service configuration
app.use('/api/admin/config', require('./routes/siteConfig')); // Site configuration management
app.use('/api/admin/payment-gateways', require('./routes/paymentGateway')); // Payment gateway configuration
app.use('/api/admin/config/networks', require('./routes/networkConfig')); // Network configuration
app.use('/api/admin/blacklist', require('./routes/blacklist')); // Blacklist management
app.use('/api/admin/system-users', require('./routes/systemUsers')); // System users management
app.use('/api/admin/api-wallets', require('./routes/apiWallets')); // API wallet monitoring
app.use('/api/admin/airtime-cash', require('./routes/adminAirtime')); // Airtime to cash admin management
app.use('/api/admin/referrals', require('./routes/adminReferral')); // Referral admin management
app.use('/api/admin/alpha-topup', require('./routes/adminAlphaTopup')); // Alpha Topup admin management
app.use('/api/admin/cac', require('./routes/adminCac')); // CAC Registration admin management
app.use('/api/admin/contact', require('./routes/adminContact')); // Contact Messages admin management
app.use('/api/admin/smile-plans', require('./routes/adminSmile')); // Smile Plan admin management
app.use('/api/admin/exam-pins', require('./routes/adminExam')); // Exam Pin admin management
app.use('/api/admin/provider-status', require('./routes/adminProviderStatus')); // Active Provider Switch
app.use('/api/admin/routing', require('./routes/adminRouting')); // Provider Routing Overrides
app.use('/api/admin/cable-plans', require('./routes/adminCable')); // Cable TV admin management
app.use('/api/admin/electricity', require('./routes/adminElectricity')); // Electricity admin management
app.use('/api/admin/sms', require('./routes/adminSms')); // Bulk SMS admin management
app.use('/api/admin/virtual-accounts', require('./routes/adminVirtualAccounts')); // Virtual Account admin management
app.use('/api/manual-services', require('./routes/manualServices')); // Manual Services (BVN/NIN)
app.use('/api/admin/manual-services', require('./routes/adminManualServices')); // Admin Manual Services
app.use('/api/academy', require('./routes/academy')); // Academy – user-facing
app.use('/api/admin/academy', require('./routes/adminAcademy')); // Academy – admin management
app.use('/api/admin/bot', require('./routes/adminBot')); // Smart Routing Bot Management
app.use('/api/admin/upgrade', require('./routes/adminUpgrade')); // Account Upgrade admin management
app.use('/api/admin/software', require('./routes/adminSoftware')); // Software Development admin management
app.use('/api/admin/reseller', require('./routes/adminReseller')); // Reseller setup admin management

// Phase 6: Vendor & Developer Tools
app.use('/api/webhook-vendor', require('./routes/webhookVendor')); // Webhook configuration for vendors
app.use('/api/analytics', require('./routes/analytics')); // Vendor analytics
app.use('/api/bulk', actionLimiterMiddleware, require('./routes/bulk')); // Bulk transaction processing
app.use('/api/beneficiary', require('./routes/beneficiary')); // Beneficiary management
app.use('/api/sms', require('./routes/sms')); // Bulk SMS
app.use('/api/ai-chat', require('./routes/aiChat')); // AI Consultant Chat
app.use('/api/waitlist', require('./routes/waitlist')); // App waitlist
app.use('/api/contact', require('./routes/contact')); // Public contact form
app.use('/api/reseller', require('./routes/reseller')); // Reseller & Software Dev

// ── External Developer API v1 (API-key authenticated, no transaction PIN) ─────
app.use('/api/v1', require('./routes/v1/index')); // v1 namespace for third-party integrations

app.get('/api', (req, res) => {
    res.json({ message: 'Ufriends 2.0 API is running' });
});

// ─── Cache Management Endpoints (Admin only) ─────────────────────────────────
app.get('/api/admin/cache/stats', adminAuth, (req, res) => {
    res.json({ success: true, cache: getStats() });
});

app.post('/api/admin/cache/flush', adminAuth, (req, res) => {
    const { prefix } = req.body;
    if (prefix) {
        const count = flushByPrefix(prefix);
        return res.json({ success: true, message: `Flushed ${count} entries with prefix: ${prefix}` });
    }
    const count = flushAll();
    res.json({ success: true, message: `Flushed all ${count} cache entries` });
});

// Handle API 404s before they fall through to the React catch-all
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API Endpoint or File Not Found' });
});

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// [SEC-MED-16] Global error handler — prevents stack trace leakage
app.use((err, req, res, next) => {
    if (err.code === 'CORS_ORIGIN_DENIED') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    console.error('[Global Error Handler]', {
        ...safeError(err),
        requestId: req.requestId,
        route: req.originalUrl?.split('?')[0]?.slice(0, 200),
    });
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: 'Internal server error' });
});

module.exports = app;
