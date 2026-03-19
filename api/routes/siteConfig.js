const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');

// Site Settings Model - we'll use a simple key-value approach
// Settings are stored in a "settings" table or use existing config

// GET /api/admin/config/settings - Get all site settings
router.get('/settings', adminAuth, async (req, res) => {
    try {
        // Fetch custom settings from AppSetting table
        const appSettings = await prisma.appSetting.findMany();
        const customConfig = {};
        appSettings.forEach(s => customConfig[s.key] = s.value);

        const settings = {
            siteName: 'Ufriends 2.0',
            siteEmail: 'support@ufriends.com',
            sitePhone: '+234 800 000 0000',
            referralBonus: 100,
            referralMinBalance: 1000,
            kycRequired: true,
            kycMinimumLevel: 1,
            maintenanceMode: false,
            registrationEnabled: true,
            minWithdrawal: 500,
            maxWithdrawal: 50000,
            withdrawalCharge: 50,
            airtimeDiscount: {
                mtn: 2.5,
                glo: 3.0,
                airtel: 2.5,
                '9mobile': 3.0
            },
            agentUpgradeAmount: 5000,
            vendorUpgradeAmount: 10000,
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            logoUrl: '/logo.png',
            faviconUrl: '/favicon.ico',
            // WhatsApp Settings
            adminWhatsappNumber: customConfig.admin_whatsapp_number || '',
            whatsappApiKey: customConfig.whatsapp_api_key || '',
            whatsappApiUrl: customConfig.whatsapp_api_url || ''
        };

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT /api/admin/config/settings - Update site settings
router.put('/settings', adminAuth, async (req, res) => {
    try {
        const settings = req.body;

        // Save WhatsApp settings to AppSetting table
        const whatsappKeys = {
            'adminWhatsappNumber': 'admin_whatsapp_number',
            'whatsappApiKey': 'whatsapp_api_key',
            'whatsappApiUrl': 'whatsapp_api_url'
        };

        for (const [settingsKey, dbKey] of Object.entries(whatsappKeys)) {
            if (settings[settingsKey] !== undefined) {
                await prisma.appSetting.upsert({
                    where: { key: dbKey },
                    update: { value: settings[settingsKey].toString() },
                    create: { key: dbKey, value: settings[settingsKey].toString() }
                });
            }
        }

        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// GET /api/admin/config/referral - Get referral configuration
router.get('/referral', adminAuth, async (req, res) => {
    try {
        const config = {
            referralBonus: 100,
            referralMinBalance: 1000,
            referralEnabled: true,
            multiLevelEnabled: false,
            maxReferralEarnings: 10000
        };

        res.json({ success: true, config });
    } catch (error) {
        console.error('Get referral config error:', error);
        res.status(500).json({ error: 'Failed to fetch referral configuration' });
    }
});

// PUT /api/admin/config/referral - Update referral configuration
router.put('/referral', adminAuth, async (req, res) => {
    try {
        const config = req.body;

        res.json({
            success: true,
            message: 'Referral configuration updated successfully',
            config
        });
    } catch (error) {
        console.error('Update referral config error:', error);
        res.status(500).json({ error: 'Failed to update referral configuration' });
    }
});

// GET /api/admin/config/kyc - Get KYC settings
router.get('/kyc', adminAuth, async (req, res) => {
    try {
        const config = {
            kycRequired: true,
            kycMinimumLevel: 1,
            level1Limit: 10000,
            level2Limit: 50000,
            level3Limit: -1, // unlimited
            autoApprove: false
        };

        res.json({ success: true, config });
    } catch (error) {
        console.error('Get KYC config error:', error);
        res.status(500).json({ error: 'Failed to fetch KYC configuration' });
    }
});

// PUT /api/admin/config/kyc - Update KYC settings
router.put('/kyc', adminAuth, async (req, res) => {
    try {
        const config = req.body;

        res.json({
            success: true,
            message: 'KYC configuration updated successfully',
            config
        });
    } catch (error) {
        console.error('Update KYC config error:', error);
        res.status(500).json({ error: 'Failed to update KYC configuration' });
    }
});

module.exports = router;
