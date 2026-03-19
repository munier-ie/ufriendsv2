const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');

/**
 * @route GET /api/notifications
 * @desc Get all notifications for the authenticated user
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: req.user.id, isRead: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Fetch notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route POST /api/notifications/mark-read
 * @desc Mark all unread notifications as read
 */
router.post('/mark-read', authenticateUser, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });

        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        console.error('Mark notifications read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a specific notification
 */
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.notification.delete({
            where: {
                id: parseInt(id),
                userId: req.user.id // Ensure user owns the notification
            }
        });
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
