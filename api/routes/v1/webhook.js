/**
 * /api/v1/webhook
 * External API v1 – Webhook Configuration
 *
 * Thin wrapper: re-uses the existing webhookVendor router logic
 * but exposes it under the /api/v1 namespace with API key auth.
 *
 * Auth: API Key (Bearer <apiKey>)
 */

const express = require('express');
const router  = express.Router();
const prisma  = require('../../../prisma/client');
const crypto  = require('crypto');
const axios   = require('axios');
const { apiKeyAuth, logApiResponse } = require('../../middleware/apiKeySecurity');

router.use(logApiResponse);

// ─── POST /configure ─────────────────────────────────────────────────────────
router.post('/configure', apiKeyAuth, async (req, res) => {
    try {
        const { webhookUrl } = req.body;
        if (!webhookUrl) {
            return res.status(400).json({ status: 1, message: 'webhookUrl is required' });
        }

        let parsed;
        try { parsed = new URL(webhookUrl); } catch {
            return res.status(400).json({ status: 1, message: 'Invalid webhookUrl format' });
        }

        // SSRF protection
        const BLOCKED = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
        if (BLOCKED.some(b => parsed.hostname === b || parsed.hostname.startsWith(b)) ||
            parsed.hostname.startsWith('10.') ||
            parsed.hostname.startsWith('172.16.') ||
            parsed.hostname.startsWith('192.168.')) {
            return res.status(400).json({ status: 1, message: 'webhookUrl cannot target a private address' });
        }

        if (parsed.protocol !== 'https:') {
            return res.status(400).json({ status: 1, message: 'webhookUrl must use HTTPS' });
        }

        const secretKey = crypto.randomBytes(32).toString('hex');
        const existing  = await prisma.webhookConfig.findUnique({ where: { userId: req.user.id } });

        if (existing) {
            await prisma.webhookConfig.update({ where: { userId: req.user.id }, data: { webhookUrl, secretKey } });
        } else {
            await prisma.webhookConfig.create({ data: { userId: req.user.id, webhookUrl, secretKey } });
        }

        res.json({ success: true, message: 'Webhook configured successfully', secretKey });
    } catch (error) {
        console.error('[v1/webhook configure] Error:', error);
        res.status(500).json({ status: 1, message: 'Failed to configure webhook' });
    }
});

// ─── GET /config ──────────────────────────────────────────────────────────────
router.get('/config', apiKeyAuth, async (req, res) => {
    try {
        const config = await prisma.webhookConfig.findUnique({ where: { userId: req.user.id } });
        if (!config) return res.json({ success: true, config: null });
        res.json({
            success: true,
            config: { webhookUrl: config.webhookUrl, secretKey: config.secretKey, isActive: config.isActive }
        });
    } catch (error) {
        console.error('[v1/webhook config] Error:', error);
        res.status(500).json({ status: 1, message: 'Failed to fetch webhook config' });
    }
});

// ─── POST /test ───────────────────────────────────────────────────────────────
router.post('/test', apiKeyAuth, async (req, res) => {
    try {
        const config = await prisma.webhookConfig.findUnique({ where: { userId: req.user.id } });
        if (!config) return res.status(404).json({ status: 1, message: 'Webhook not configured' });

        const payload = { event: 'test', data: { message: 'Test webhook from Ufriends API', timestamp: new Date().toISOString() } };
        const signature = crypto.createHmac('sha256', config.secretKey).update(JSON.stringify(payload)).digest('hex');

        try {
            const response = await axios.post(config.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json', 'X-Ufriends-Signature': signature },
                timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000')
            });

            await prisma.webhookLog.create({
                data: { userId: req.user.id, event: 'test', url: config.webhookUrl, payload: JSON.stringify(payload), statusCode: response.status, response: JSON.stringify(response.data), success: true }
            });

            res.json({ success: true, message: 'Test webhook sent successfully', response: response.data });
        } catch (err) {
            await prisma.webhookLog.create({
                data: { userId: req.user.id, event: 'test', url: config.webhookUrl, payload: JSON.stringify(payload), statusCode: err.response?.status || 0, response: err.message, success: false }
            });
            res.status(400).json({ status: 1, message: 'Webhook test failed. Verify your URL is reachable.' });
        }
    } catch (error) {
        console.error('[v1/webhook test] Error:', error);
        res.status(500).json({ status: 1, message: 'Failed to send test webhook' });
    }
});

// ─── POST /regenerate-secret ──────────────────────────────────────────────────
router.post('/regenerate-secret', apiKeyAuth, async (req, res) => {
    try {
        const config = await prisma.webhookConfig.findUnique({ where: { userId: req.user.id } });
        if (!config) return res.status(404).json({ status: 1, message: 'Webhook not configured' });

        const secretKey = crypto.randomBytes(32).toString('hex');
        await prisma.webhookConfig.update({ where: { userId: req.user.id }, data: { secretKey } });

        res.json({ success: true, message: 'Webhook secret regenerated', secretKey });
    } catch (error) {
        console.error('[v1/webhook regen-secret] Error:', error);
        res.status(500).json({ status: 1, message: 'Failed to regenerate secret' });
    }
});

// ─── GET /logs ────────────────────────────────────────────────────────────────
router.get('/logs', apiKeyAuth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const logs  = await prisma.webhookLog.findMany({
            where:   { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take:    limit
        });
        res.json({ success: true, logs });
    } catch (error) {
        console.error('[v1/webhook logs] Error:', error);
        res.status(500).json({ status: 1, message: 'Failed to fetch webhook logs' });
    }
});

module.exports = router;
