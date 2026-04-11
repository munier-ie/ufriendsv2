const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initCron } = require('./services/smartRouting.service');

// Start smart routing bot cron jobs
initCron();

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

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Maintenance Middleware
const maintenance = require('./middleware/maintenance');
app.use(maintenance);

// Serve uploaded CAC documents
app.use('/api/uploads/cac', express.static(path.join(__dirname, 'uploads/cac')));
// Serve manual service proof uploads
app.use('/api/uploads/manual-proof', express.static(path.join(__dirname, 'uploads/manual-proof')));
// Serve manual identification document uploads
app.use('/api/uploads/manual-ids', express.static(path.join(__dirname, 'uploads/manual-ids')));
// Serve academy content uploads
app.use('/api/uploads/academy', express.static(path.join(__dirname, 'uploads/academy')));

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/user', userRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/pins', pinsRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/twofa', require('./routes/twofa')); // 2FA authentication routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin/auth', adminAuthRoutes); // Separate admin authentication
app.use('/api/kyc', kycRoutes); // KYC verification routes
app.use('/api/virtual-accounts', require('./routes/virtualAccounts')); // Virtual accounts management
app.use('/api/webhooks', require('./routes/webhooks')); // Payment gateway webhooks
app.use('/api/referrals', require('./routes/referral')); // Referral system routes
app.use('/api/airtime-cash', require('./routes/airtimeToCash')); // Airtime to Cash routes
app.use('/api/transfer', require('./routes/transfer')); // P2P Transfer routes
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
app.use('/api/bulk', require('./routes/bulk')); // Bulk transaction processing
app.use('/api/beneficiary', require('./routes/beneficiary')); // Beneficiary management
app.use('/api/sms', require('./routes/sms')); // Bulk SMS
app.use('/api/ai-chat', require('./routes/aiChat')); // AI Consultant Chat

app.get('/api', (req, res) => {
    res.json({ message: 'Ufriends 2.0 API is running' });
});

module.exports = app;
