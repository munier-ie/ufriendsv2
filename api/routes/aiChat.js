const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma/client');
const aiService = require('../services/ai.service');

// Restrict AI workspace to development environment only (based on API_NODE_ENV from .env)
router.use((req, res, next) => {
    const env = process.env.API_NODE_ENV || process.env.NODE_ENV || 'production';
    if (env !== 'development') {
        return res.status(403).json({
            error: 'AI workspace is currently under development and disabled in production.',
        });
    }
    next();
});

// Soft / Optional Auth: authenticated users get personalized data, guests are welcomed without 401 errors
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId || decoded.id;
                if (userId) {
                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { id: true, firstName: true, lastName: true, phone: true, email: true, walletBalance: true },
                    });
                    if (user) {
                        req.user = user;
                        return next();
                    }
                }
            } catch (jwtErr) {
                // Expired or invalid token, proceed safely as guest
            }
        }
    } catch (err) {}

    const clientIp = (req.ip || req.socket?.remoteAddress || 'guest').toString().replace(/[^a-zA-Z0-9]/g, '_');
    req.user = {
        id: `guest_${clientIp.slice(0, 32)}`,
        firstName: 'Guest',
        isGuest: true,
        walletBalance: 2450.0,
    };
    next();
}

/**
 * @route POST /api/ai-chat/consult
 * @desc Interaction with Ufriends AI Assistant
 */
router.post('/consult', optionalAuth, async (req, res) => {
    try {
        const { message, conversationId, reset, model } = req.body || {};

        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const result = await aiService.chat(req.user.id, message, {
            conversationId,
            reset: reset === true,
            model,
            userContext: req.user,
        });

        res.json(result);
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({
            error: 'Ufriends AI is temporarily busy. Please try again.',
            details: error.message,
        });
    }
});

router.post('/reset', optionalAuth, async (req, res) => {
    try {
        aiService.reset(req.user.id, req.body?.conversationId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset conversation' });
    }
});

router.get('/models', (req, res) => {
    res.json({
        models: [
            'deepseek-v4.1-flash',
            'qwen3.8-omni-flash',
            'qwen3.8-flash',
            'glm-5.3',
            'kimi-k3',
        ],
        default: 'deepseek-v4.1-flash',
    });
});

router.post('/confirm', optionalAuth, (req, res) => {
    const { quoteId, network } = req.body || {};
    const result = aiService.confirmQuote(quoteId, network);
    res.json(result);
});

router.post('/cancel', optionalAuth, (req, res) => {
    const { quoteId } = req.body || {};
    const result = aiService.cancelQuote(quoteId);
    res.json(result);
});

module.exports = router;
