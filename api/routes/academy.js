/**
 * Academy Routes – User-facing
 * Endpoints for browsing, viewing, and purchasing academy content.
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const { creditReferralBonus } = require('../services/referral.service');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Strip sensitive/full content from premium items the user has NOT purchased */
function sanitizeForListing(content, purchasedIds) {
    const isPurchased = purchasedIds.has(content.id);
    if (content.plan === 'premium' && !isPurchased) {
        return {
            id: content.id,
            title: content.title,
            description: content.description,
            type: content.type,
            plan: content.plan,
            price: content.price,
            thumbnailUrl: content.thumbnailUrl,
            sortOrder: content.sortOrder,
            createdAt: content.createdAt,
            locked: true,
        };
    }
    return { ...content, locked: false };
}

// ─── GET /api/academy ────────────────────────────────────────────────────────
// List all active content – premium items show only metadata unless purchased
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { type, plan } = req.query;
        const where = { active: true };
        if (type) where.type = type;
        if (plan) where.plan = plan;

        const [contents, purchases] = await Promise.all([
            prisma.academyContent.findMany({
                where,
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
                select: {
                    id: true, title: true, description: true, type: true,
                    plan: true, price: true, fileUrl: true, thumbnailUrl: true,
                    youtubeUrl: true, externalUrl: true, body: true,
                    sortOrder: true, createdAt: true,
                },
            }),
            prisma.academyPurchase.findMany({
                where: { userId: req.user.id },
                select: { contentId: true },
            }),
        ]);

        const purchasedIds = new Set(purchases.map(p => p.contentId));
        const sanitized = contents.map(c => sanitizeForListing(c, purchasedIds));

        res.json({ contents: sanitized });
    } catch (error) {
        console.error('Academy list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/academy/:id ────────────────────────────────────────────────────
// View a single content item – returns full content if free or purchased
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid content ID' });

        const content = await prisma.academyContent.findFirst({
            where: { id, active: true },
        });

        if (!content) return res.status(404).json({ error: 'Content not found' });

        if (content.plan === 'premium') {
            const purchase = await prisma.academyPurchase.findUnique({
                where: { userId_contentId: { userId: req.user.id, contentId: id } },
            });
            if (!purchase) {
                return res.status(403).json({
                    error: 'Purchase required',
                    requiresPurchase: true,
                    price: content.price,
                    title: content.title,
                    description: content.description,
                    thumbnailUrl: content.thumbnailUrl,
                    type: content.type,
                });
            }
        }

        res.json({ content: { ...content, locked: false } });
    } catch (error) {
        console.error('Academy view error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/academy/:id/purchase ─────────────────────────────────────────
// Purchase premium content – requires transaction PIN verification
const purchaseSchema = z.object({
    transactionPin: z.string().min(4).max(6),
});

router.post('/:id/purchase', authenticateUser, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid content ID' });

        const parsed = purchaseSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Transaction PIN is required' });
        }

        const content = await prisma.academyContent.findFirst({
            where: { id, active: true },
        });
        if (!content) return res.status(404).json({ error: 'Content not found' });
        if (content.plan !== 'premium') {
            return res.status(400).json({ error: 'This content is free – no purchase needed' });
        }

        // Check user wallet, PIN status and balance in one query
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { wallet: true, transactionPin: true, pinEnabled: true },
        });

        // Transaction PIN check
        if (!user.pinEnabled || !user.transactionPin) {
            return res.status(403).json({ error: 'Please set up a transaction PIN before making purchases' });
        }
        const pinMatch = await bcrypt.compare(parsed.data.transactionPin, user.transactionPin);
        if (!pinMatch) {
            return res.status(403).json({ error: 'Incorrect transaction PIN' });
        }

        // Balance check
        if (user.wallet < content.price) {
            return res.status(400).json({
                error: 'Insufficient wallet balance',
                required: content.price,
                available: user.wallet,
            });
        }

        // Check if already purchased (idempotency)
        const existing = await prisma.academyPurchase.findUnique({
            where: { userId_contentId: { userId: req.user.id, contentId: id } },
        });
        if (existing) {
            return res.status(400).json({ error: 'You have already purchased this content' });
        }

        // Atomic: deduct wallet + create purchase + create transaction record
        const reference = `ACADEMY-${Date.now()}-${req.user.id}`;
        const [, purchase] = await prisma.$transaction([
            prisma.user.update({
                where: { id: req.user.id },
                data: { wallet: { decrement: content.price } },
            }),
            prisma.academyPurchase.create({
                data: {
                    userId: req.user.id,
                    contentId: id,
                    amount: content.price,
                },
            }),
            prisma.transaction.create({
                data: {
                    reference,
                    serviceName: 'Academy Content',
                    description: `Unlocked: ${content.title}`,
                    amount: -content.price,
                    status: 0,
                    oldBalance: user.wallet,
                    newBalance: user.wallet - content.price,
                    profit: content.price, // Academy content is usually 100% platform profit
                    type: 'academy',
                    userId: req.user.id,
                },
            }),
        ]);

        // Trigger referral bonus
        creditReferralBonus(req.user.id, 'academy', content.referralCommission || 0).catch(err => console.error('Academy Bonus error:', err));

        res.json({
            success: true,
            message: 'Content unlocked successfully',
            purchase,
        });
    } catch (error) {
        console.error('Academy purchase error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
