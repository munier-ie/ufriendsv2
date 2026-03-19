const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const adminAuth = require('../middleware/adminAuth');
const { z } = require('zod');

// Schema for reply
const replySchema = z.object({
    reply: z.string().min(1, "Reply cannot be empty")
});

// GET /api/admin/contact - List messages
router.get('/', adminAuth, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const where = {};
        if (status !== undefined) {
            where.status = parseInt(status);
        }

        const [messages, total] = await Promise.all([
            prisma.contactMessage.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: parseInt(skip),
                take: parseInt(limit),
                include: {
                    adminUser: {
                        select: { username: true }
                    }
                }
            }),
            prisma.contactMessage.count({ where })
        ]);

        res.json({
            success: true,
            messages,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Fetch contact messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// GET /api/admin/contact/stats - Get stats
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const [total, unread, replied] = await Promise.all([
            prisma.contactMessage.count(),
            prisma.contactMessage.count({ where: { status: 0 } }),
            prisma.contactMessage.count({ where: { status: 2 } })
        ]);

        res.json({ success: true, stats: { total, unread, replied } });
    } catch (error) {
        console.error('Fetch message stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// PUT /api/admin/contact/:id/reply - Reply to message
router.put('/:id/reply', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { reply } = replySchema.parse(req.body);
        const adminId = req.admin.id;

        const message = await prisma.contactMessage.findUnique({
            where: { id: parseInt(id) }
        });

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        await prisma.contactMessage.update({
            where: { id: parseInt(id) },
            data: {
                reply,
                status: 2, // Replied
                adminId,
                repliedAt: new Date()
            }
        });

        // Here send email to user with the reply...
        // await sendEmail(message.email, message.subject, reply);

        res.json({ success: true, message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Reply message error:', error);
        res.status(400).json({ error: error.message || 'Failed to send reply' });
    }
});

// DELETE /api/admin/contact/:id - Delete message
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contactMessage.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

module.exports = router;
