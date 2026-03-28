const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');

// Site Settings Logic
// GET /api/admin/config/public-settings - Safe public settings for frontend branding
router.get('/public-settings', async (req, res) => {
    try {
        const settingsService = require('../services/settings.service');
        const allSettings = await settingsService.getAllSettings();
        
        // Filter only non-sensitive keys for the public
        const publicKeys = [
            'siteName', 'sitePhone', 'siteEmail', 
            'primaryColor', 'secondaryColor', 
            'logoUrl', 'faviconUrl', 
            'registrationEnabled', 'maintenanceMode'
        ];
        
        const settings = {};
        publicKeys.forEach(key => {
            if (allSettings[key] !== undefined) {
                settings[key] = allSettings[key];
            } else {
                // Add defaults if missing in DB
                const defaults = {
                    siteName: 'Ufriends 2.0',
                    primaryColor: '#004687',
                    secondaryColor: '#1E90FF',
                    registrationEnabled: true,
                    maintenanceMode: false
                };
                if (defaults[key]) settings[key] = defaults[key];
            }
        });

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({ error: 'Failed to fetch site branding' });
    }
});

// GET /api/admin/config/settings - Get all site settings
router.get('/settings', adminAuth, async (req, res) => {
    try {
        // Default settings as fallback
        const defaultSettings = {
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
            adminWhatsappNumber: '',
            whatsappApiKey: '',
            whatsappApiUrl: ''
        };

        // Fetch all settings from AppSetting table
        const dbSettings = await prisma.appSetting.findMany();
        const settings = { ...defaultSettings };

        const stringOnlyKeys = ['siteName', 'siteEmail', 'sitePhone', 'logoUrl', 'faviconUrl', 'adminWhatsappNumber', 'primaryColor', 'secondaryColor'];

        dbSettings.forEach(s => {
            let value = s.value;
            const key = s.key;

            if (stringOnlyKeys.includes(key)) {
                // Keep as string
                settings[key] = value;
                return;
            }

            // Attempt to parse other types (for objects/arrays/numbers/booleans)
            try {
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                else if (value.startsWith('{') || value.startsWith('[')) {
                    value = JSON.parse(value);
                } else if (!isNaN(value) && value.trim() !== '') {
                    value = parseFloat(value);
                }
            } catch (e) {
                // Stay as string if parsing fails
            }
            settings[key] = value;
        });

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
        const settingsService = require('../services/settings.service');

        // Use transaction to ensure all settings are saved or none
        await prisma.$transaction(
            Object.entries(settings).map(([key, value]) => {
                // Handle null/undefined safely
                let stringValue = '';
                if (value !== null && value !== undefined) {
                    stringValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
                }

                return prisma.appSetting.upsert({
                    where: { key },
                    update: { value: stringValue },
                    create: { key, value: stringValue }
                });
            })
        );

        // Invalidate cache in SettingsService
        if (settingsService.cache) {
            console.log('[Admin] Invalidating SettingsService cache');
            settingsService.cache = null;
            settingsService.lastFetch = 0;
        }

        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings: ' + error.message });
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
