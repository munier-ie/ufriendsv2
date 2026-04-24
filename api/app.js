const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { initCron } = require('./services/smartRouting.service');

// Start smart routing bot cron jobs
initCron();

// [SEC-CRIT-02] Rate limiters — protect auth endpoints from brute-force
const authLimiter = new RateLimiterMemory({ points: 10, duration: 60 }); // 10 req/min per IP
const otpLimiter  = new RateLimiterMemory({ points: 5,  duration: 300 }); // 5 OTP attempts per 5 min per IP
const forgotLimiter = new RateLimiterMemory({ points: 3, duration: 3600 }); // 3 forgot-password per hour
const actionLimiter = new RateLimiterMemory({ points: 20, duration: 60 }); // 20 actions per minute per IP

const makeRateLimiter = (limiter) => async (req, res, next) => {
    try {
        await limiter.consume(req.ip);
        next();
    } catch {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
};

const actionLimiterMiddleware = makeRateLimiter(actionLimiter);

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const userRoutes = require('./routes/user');
const servicesRoutes = require('./routes/services');
const pinsRoutes = require('./routes/pins');
const verifyRoutes = require('./routes/verify');
const adminRoutes = require('./routes/admin');
const adminAuthRoutes = require('./routes/adminAuth');
const kycRoutes = require('./routes/kyc'); // Import KYC routes

const path = require('path');

const app = express();

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
    ]);

    // Automatically include both www and non-www for the configured FRONTEND_URL
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl) {
        origins.add(frontendUrl);
        try {
            const parsed = new URL(frontendUrl);
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

    return origins;
};

const allowedOrigins = buildAllowedOrigins();

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server or same-origin requests (no Origin header)
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
}));

// [SEC-MED-04] Raw body preservation for webhook signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use('/api/webhook-vendor', express.raw({ type: 'application/json' }));

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
// Serve NIN/BVN slips (Protected)
app.use('/api/uploads/slips', protectedUploads, express.static(path.join(__dirname, '../uploads/slips')));


// [SEC-CRIT-02] Apply rate limiters to auth endpoints BEFORE mounting the router
// This correctly intercepts matching paths and either passes or rejects before the route handler fires
app.post('/api/auth/access',          makeRateLimiter(authLimiter));
app.post('/api/auth/register',        makeRateLimiter(authLimiter));
app.post('/api/auth/verify-email',    makeRateLimiter(otpLimiter));
app.post('/api/auth/verify-2fa',      makeRateLimiter(otpLimiter));
app.post('/api/auth/forgot-password', makeRateLimiter(forgotLimiter));
app.post('/api/admin/auth/access',    makeRateLimiter(authLimiter));
app.post('/api/admin/auth/verify-2fa', makeRateLimiter(otpLimiter));

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
app.use('/api/notifications', require('./routes/notifications')); // Notifications routes
app.use('/api/professional', require('./routes/professional')); // Professional services (NIN, BVN, CAC)
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

// Phase 6: Vendor & Developer Tools
app.use('/api/webhook-vendor', require('./routes/webhookVendor')); // Webhook configuration for vendors
app.use('/api/analytics', require('./routes/analytics')); // Vendor analytics
app.use('/api/bulk', actionLimiterMiddleware, require('./routes/bulk')); // Bulk transaction processing
app.use('/api/beneficiary', require('./routes/beneficiary')); // Beneficiary management
app.use('/api/sms', require('./routes/sms')); // Bulk SMS
app.use('/api/ai-chat', require('./routes/aiChat')); // AI Consultant Chat
app.use('/api/waitlist', require('./routes/waitlist')); // App waitlist

app.get('/api', (req, res) => {
    res.json({ message: 'Ufriends 2.0 API is running' });
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

module.exports = app;
