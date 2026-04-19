const express = require('express');
const router = express.Router();
const aiService = require('../services/ai.service');
const authenticateUser = require('../middleware/auth');

/**
 * @route POST /api/ai-chat/consult
 * @desc Interaction with the AI Software Consultant
 */
router.post('/consult', authenticateUser, async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const safeHistory = (history || []).slice(-20);
        const reply = await aiService.chat(safeHistory, message);
        res.json({ reply });
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ error: error.message || 'AI Consultant is currently unavailable' });
    }
});

module.exports = router;
