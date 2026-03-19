/**
 * Admin Academy Routes – CRUD for Academy Content Management
 * Requires admin authentication for all endpoints.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const prisma = require('../../prisma/client');
const authenticateAdmin = require('../middleware/adminAuth');

// ─── Upload configuration ────────────────────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '../uploads/academy');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'video/mp4', 'video/webm', 'video/ogg',
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype}`), false);
        }
    },
});

const multiUpload = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
]);

// ─── Validation Schemas ──────────────────────────────────────────────────────

const contentSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(1000).optional(),
    type: z.enum(['video', 'pdf', 'image', 'text', 'livestream']),
    plan: z.enum(['free', 'premium']).default('free'),
    price: z.coerce.number().min(0).default(0),
    youtubeUrl: z.string().url().optional().or(z.literal('')),
    externalUrl: z.string().url().optional().or(z.literal('')),
    body: z.string().max(100000).optional(),
    sortOrder: z.coerce.number().int().default(0),
    referralCommission: z.coerce.number().nonnegative().default(0),
    active: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

// ─── Middleware ──────────────────────────────────────────────────────────────

function handleMulterError(err, _req, res, next) {
    if (err instanceof multer.MulterError || err?.message?.startsWith('File type')) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
}

// ─── GET /api/admin/academy ──────────────────────────────────────────────────
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const contents = await prisma.academyContent.findMany({
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            include: {
                _count: { select: { purchases: true } },
            },
        });
        res.json({ contents });
    } catch (error) {
        console.error('Admin academy list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/admin/academy ─────────────────────────────────────────────────
router.post('/', authenticateAdmin, (req, res, next) => {
    multiUpload(req, res, (err) => {
        if (err) return handleMulterError(err, req, res, next);
        next();
    });
}, async (req, res) => {
    try {
        const parsed = contentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
        }

        const data = parsed.data;
        const fileUrl = req.files?.file?.[0]
            ? `/api/uploads/academy/${req.files.file[0].filename}`
            : undefined;
        const thumbnailUrl = req.files?.thumbnail?.[0]
            ? `/api/uploads/academy/${req.files.thumbnail[0].filename}`
            : undefined;

        // If premium, price must be > 0
        if (data.plan === 'premium' && data.price <= 0) {
            return res.status(400).json({ error: 'Premium content must have a price greater than 0' });
        }

        const content = await prisma.academyContent.create({
            data: {
                title: data.title,
                description: data.description || null,
                type: data.type,
                plan: data.plan,
                price: data.price,
                fileUrl: fileUrl || null,
                thumbnailUrl: thumbnailUrl || null,
                youtubeUrl: data.youtubeUrl || null,
                externalUrl: data.externalUrl || null,
                body: data.body || null,
                sortOrder: data.sortOrder,
                referralCommission: data.referralCommission,
                active: data.active ?? true,
            },
        });

        res.status(201).json({ success: true, content });
    } catch (error) {
        console.error('Admin academy create error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PUT /api/admin/academy/:id ──────────────────────────────────────────────
router.put('/:id', authenticateAdmin, (req, res, next) => {
    multiUpload(req, res, (err) => {
        if (err) return handleMulterError(err, req, res, next);
        next();
    });
}, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid content ID' });

        const existing = await prisma.academyContent.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Content not found' });

        const parsed = contentSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
        }

        const data = parsed.data;
        if (data.plan === 'premium' && (data.price ?? existing.price) <= 0) {
            return res.status(400).json({ error: 'Premium content must have a price greater than 0' });
        }

        const fileUrl = req.files?.file?.[0]
            ? `/api/uploads/academy/${req.files.file[0].filename}`
            : undefined;
        const thumbnailUrl = req.files?.thumbnail?.[0]
            ? `/api/uploads/academy/${req.files.thumbnail[0].filename}`
            : undefined;

        const content = await prisma.academyContent.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.type !== undefined && { type: data.type }),
                ...(data.plan !== undefined && { plan: data.plan }),
                ...(data.price !== undefined && { price: data.price }),
                ...(fileUrl !== undefined && { fileUrl }),
                ...(thumbnailUrl !== undefined && { thumbnailUrl }),
                ...(data.youtubeUrl !== undefined && { youtubeUrl: data.youtubeUrl || null }),
                ...(data.externalUrl !== undefined && { externalUrl: data.externalUrl || null }),
                ...(data.body !== undefined && { body: data.body || null }),
                ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
                ...(data.referralCommission !== undefined && { referralCommission: data.referralCommission }),
                ...(data.active !== undefined && { active: data.active }),
            },
        });

        res.json({ success: true, content });
    } catch (error) {
        console.error('Admin academy update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── PATCH /api/admin/academy/:id/toggle ─────────────────────────────────────
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid content ID' });

        const existing = await prisma.academyContent.findUnique({ where: { id }, select: { active: true } });
        if (!existing) return res.status(404).json({ error: 'Content not found' });

        const content = await prisma.academyContent.update({
            where: { id },
            data: { active: !existing.active },
        });

        res.json({ success: true, active: content.active });
    } catch (error) {
        console.error('Admin academy toggle error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── DELETE /api/admin/academy/:id ───────────────────────────────────────────
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid content ID' });

        const existing = await prisma.academyContent.findUnique({
            where: { id },
            select: { fileUrl: true, thumbnailUrl: true },
        });
        if (!existing) return res.status(404).json({ error: 'Content not found' });

        // Delete purchases first, then the content
        await prisma.$transaction([
            prisma.academyPurchase.deleteMany({ where: { contentId: id } }),
            prisma.academyContent.delete({ where: { id } }),
        ]);

        // Clean up files
        const removeFile = (url) => {
            if (!url) return;
            const filePath = path.join(__dirname, '../..', url.replace('/api/', ''));
            fs.unlink(filePath, () => { }); // silent fail
        };
        removeFile(existing.fileUrl);
        removeFile(existing.thumbnailUrl);

        res.json({ success: true, message: 'Content deleted' });
    } catch (error) {
        console.error('Admin academy delete error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
