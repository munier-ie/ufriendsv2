const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const { verifyToken } = require('../middleware/auth');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Webhook Configuration Routes
 * Handles vendor webhook setup, testing, and log retrieval
 * with HMAC-SHA256 signature generation for security
 */

// Configure webhook URL and secret
router.post('/configure', verifyToken, async (req, res) => {
    try {
        const { webhookUrl } = req.body;
        const userId = req.user.id;

        // Validate webhook URL
        if (!webhookUrl) {
            return res.status(400).json({ message: 'Webhook URL is required' });
        }

        // Ensure HTTPS in production
        if (process.env.NODE_ENV === 'production' && !webhookUrl.startsWith('https://')) {
            return res.status(400).json({ message: 'Webhook URL must use HTTPS in production' });
        }

        // Generate secure webhook secret
        const secretKey = crypto.randomBytes(32).toString('hex');

        // Check if webhook config exists
        const existing = await prisma.webhookConfig.findUnique({
            where: { userId }
        });

        if (existing) {
            // Update existing config
            await prisma.webhookConfig.update({
                where: { userId },
                data: { webhookUrl, secretKey }
            });
        } else {
            // Create new config
            await prisma.webhookConfig.create({
                data: {
                    userId,
                    webhookUrl,
                    secretKey
                }
            });
        }

        res.json({
            status: 0,
            message: 'Webhook configured successfully',
            secretKey
        });

    } catch (error) {
        console.error('Webhook configuration error:', error);
        res.status(500).json({ message: 'Failed to configure webhook' });
    }
});

// Send test webhook
router.post('/test', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get webhook config
        const config = await prisma.webhookConfig.findUnique({
            where: { userId }
        });

        if (!config) {
            return res.status(404).json({ message: 'Webhook not configured' });
        }

        // Create test payload
        const payload = {
            event: 'test',
            data: {
                message: 'This is a test webhook from Ufriends',
                timestamp: new Date().toISOString()
            }
        };

        // Generate signature
        const signature = crypto
            .createHmac('sha256', config.secretKey)
            .update(JSON.stringify(payload))
            .digest('hex');

        // Send webhook
        try {
            const response = await axios.post(config.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Ufriends-Signature': signature
                },
                timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000')
            });

            // Log successful test
            await prisma.webhookLog.create({
                data: {
                    userId,
                    event: 'test',
                    url: config.webhookUrl,
                    payload: JSON.stringify(payload),
                    statusCode: response.status,
                    response: JSON.stringify(response.data),
                    success: true
                }
            });

            res.json({
                status: 0,
                message: 'Test webhook sent successfully',
                response: response.data
            });

        } catch (webhookError) {
            // Log failed test
            await prisma.webhookLog.create({
                data: {
                    userId,
                    event: 'test',
                    url: config.webhookUrl,
                    payload: JSON.stringify(payload),
                    statusCode: webhookError.response?.status || 0,
                    response: webhookError.message,
                    success: false
                }
            });

            res.status(400).json({
                message: 'Webhook test failed',
                error: webhookError.message
            });
        }

    } catch (error) {
        console.error('Test webhook error:', error);
        res.status(500).json({ message: 'Failed to send test webhook' });
    }
});

// Get webhook logs
router.get('/logs', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const logs = await prisma.webhookLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        res.json({ status: 0, logs });

    } catch (error) {
        console.error('Get webhook logs error:', error);
        res.status(500).json({ message: 'Failed to fetch webhook logs' });
    }
});

// Regenerate webhook secret
router.post('/regenerate-secret', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const config = await prisma.webhookConfig.findUnique({
            where: { userId }
        });

        if (!config) {
            return res.status(404).json({ message: 'Webhook not configured' });
        }

        // Generate new secret
        const secretKey = crypto.randomBytes(32).toString('hex');

        await prisma.webhookConfig.update({
            where: { userId },
            data: { secretKey }
        });

        res.json({
            status: 0,
            message: 'Webhook secret regenerated successfully',
            secretKey
        });

    } catch (error) {
        console.error('Regenerate secret error:', error);
        res.status(500).json({ message: 'Failed to regenerate secret' });
    }
});

// Get webhook configuration
router.get('/config', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const config = await prisma.webhookConfig.findUnique({
            where: { userId }
        });

        if (!config) {
            return res.json({ status: 0, config: null });
        }

        res.json({
            status: 0,
            config: {
                webhookUrl: config.webhookUrl,
                secretKey: config.secretKey,
                isActive: config.isActive
            }
        });

    } catch (error) {
        console.error('Get webhook config error:', error);
        res.status(500).json({ message: 'Failed to fetch webhook configuration' });
    }
});

/**
 * Send webhook notification to vendor
 * Called internally from transaction processing
 */
const sendWebhookNotification = async (userId, event, data) => {
    try {
        // Get webhook config
        const config = await prisma.webhookConfig.findUnique({
            where: { userId }
        });

        if (!config || !config.isActive) {
            return; // No webhook configured or inactive
        }

        const payload = { event, data };

        // Generate signature
        const signature = crypto
            .createHmac('sha256', config.secretKey)
            .update(JSON.stringify(payload))
            .digest('hex');

        // Send webhook with retries
        const maxAttempts = parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3');
        let attempt = 0;
        let success = false;

        while (attempt < maxAttempts && !success) {
            attempt++;

            try {
                const response = await axios.post(config.webhookUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Ufriends-Signature': signature
                    },
                    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000')
                });

                // Log successful delivery
                await prisma.webhookLog.create({
                    data: {
                        userId,
                        event,
                        url: config.webhookUrl,
                        payload: JSON.stringify(payload),
                        statusCode: response.status,
                        response: JSON.stringify(response.data).substring(0, 1000),
                        attempt,
                        success: true
                    }
                });

                success = true;

            } catch (error) {
                // Log failed attempt
                await prisma.webhookLog.create({
                    data: {
                        userId,
                        event,
                        url: config.webhookUrl,
                        payload: JSON.stringify(payload),
                        statusCode: error.response?.status || 0,
                        response: error.message.substring(0, 1000),
                        attempt,
                        success: false
                    }
                });

                // Wait before retry (exponential backoff)
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                }
            }
        }

    } catch (error) {
        console.error('Send webhook notification error:', error);
    }
};

module.exports = router;
module.exports.sendWebhookNotification = sendWebhookNotification;
