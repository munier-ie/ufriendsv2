/**
 * Slip Download Route
 * 
 * Securely streams NIN/BVN slip PDFs from Cloudflare R2 (or local fallback)
 * through our authenticated API.
 * 
 * Security Controls (OWASP A01: Broken Access Control & Data Exposure):
 * 1. Every request must be authenticated via user JWT or admin JWT.
 * 2. Strict ownership check: users can ONLY access slips they generated.
 * 3. Token supported via Authorization header or ?token= query param (for iframes/direct downloads).
 * 4. Strict anti-caching headers prevent CDNs, proxies, or browsers from storing sensitive identity docs.
 * 5. Underlying R2 bucket credentials and storage keys are never exposed to the client.
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const prisma = require('../../prisma/client');
const { getSlipStream, isR2Configured } = require('../utils/r2');

// ── Security & Anti-caching Headers ──────────────────────────────────────────
const SLIP_HEADERS = {
    'Content-Type': 'application/pdf',
    // Strictly forbid caching of sensitive identity documents across all intermediaries
    'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    // Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',
};

/**
 * Middleware: Authenticate either user or admin JWT.
 * Accepts header 'Authorization: Bearer <token>' or query param '?token=<token>'.
 */
const authenticateAny = async (req, res, next) => {
    try {
        let token = null;
        if (req.headers.authorization) {
            token = req.headers.authorization.replace(/^bearer\s+/i, '').trim();
        } else if (req.query.token) {
            token = String(req.query.token).trim();
        }

        if (!token || token === 'undefined' || token === 'null') {
            return res.status(401).json({ error: 'Authentication required to access this document' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if admin token
        if (decoded.isAdmin) {
            const activeAdminSession = await prisma.adminLogin.findUnique({ where: { token } });
            if (!activeAdminSession) {
                return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
            }

            const admin = await prisma.adminUser.findUnique({ where: { id: decoded.id } });
            if (!admin || admin.status === 0) {
                return res.status(403).json({ error: 'Admin account inactive or blocked' });
            }

            req.admin = admin;
            req.isAdmin = true;
            return next();
        }

        // Regular user token
        const activeUserSession = await prisma.userLogin.findUnique({ where: { token } });
        if (!activeUserSession) {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.regStatus === 1) return res.status(403).json({ error: 'Account blocked. Contact support.' });
        if (user.regStatus === 2) return res.status(403).json({ error: 'Account is terminated.' });

        req.user = user;
        req.isAdmin = false;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
};

/**
 * Stream PDF from Cloudflare R2 (Primary) or local disk (Fallback) with security headers.
 */
async function streamSlip(res, pdfPathOrKey, filename = 'slip.pdf') {
    for (const [key, value] of Object.entries(SLIP_HEADERS)) {
        res.setHeader(key, value);
    }
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Normalize path to R2 object key:
    // e.g. "/api/uploads/slips/nin/premium/uuid.pdf" -> "slips/nin/premium/uuid.pdf"
    // e.g. "slips/nin/premium/uuid.pdf" -> "slips/nin/premium/uuid.pdf"
    let r2Key = pdfPathOrKey;
    if (r2Key.startsWith('/') || r2Key.startsWith('uploads/')) {
        const relativePath = r2Key.replace(/^\/?(api\/)?uploads\/slips\//, '');
        r2Key = `slips/${relativePath}`;
    }

    // Relative path for local disk lookup fallback
    const relativePath = pdfPathOrKey.replace(/^\/?(api\/)?uploads\/slips\//, '');
    const localPath = path.join(__dirname, '../../uploads/slips', relativePath);

    // 1. PRIMARY: Try Cloudflare R2 first if configured
    if (isR2Configured()) {
        try {
            console.log(`[Slips] Fetching slip from Cloudflare R2: ${r2Key}`);
            const { stream, contentLength } = await getSlipStream(r2Key);
            if (contentLength) res.setHeader('Content-Length', contentLength);
            res.setHeader('X-Slip-Source', 'cloudflare-r2');
            console.log(`[Slips] Successfully streaming from Cloudflare R2: ${r2Key} (${contentLength} bytes)`);
            return stream.pipe(res);
        } catch (r2Err) {
            console.warn(`[Slips] R2 fetch failed for key "${r2Key}": ${r2Err.message}. Checking local disk fallback...`);
        }
    } else {
        console.warn('[Slips] R2 credentials not configured. Falling back to local disk.');
    }

    // 2. FALLBACK: Check local filesystem (legacy unmigrated slips or offline dev)
    if (fs.existsSync(localPath)) {
        console.log(`[Slips] Serving slip from local disk fallback: ${localPath}`);
        const stat = fs.statSync(localPath);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('X-Slip-Source', 'local-disk-fallback');
        return fs.createReadStream(localPath).pipe(res);
    }

    // 3. Not found anywhere
    console.error(`[Slips] File not found in R2 (${r2Key}) or local disk (${localPath})`);
    if (!res.headersSent) {
        return res.status(404).json({ error: 'Slip document file could not be found' });
    }
}

/**
 * GET /api/slips/nin/:reportId/download
 * Stream an NIN slip PDF — authenticated, ownership-verified.
 */
router.get('/nin/:reportId/download', authenticateAny, async (req, res) => {
    try {
        const reportId = parseInt(req.params.reportId, 10);
        if (isNaN(reportId)) {
            return res.status(400).json({ error: 'Invalid report ID' });
        }

        const report = await prisma.ninReport.findFirst({
            where: {
                id: reportId,
                ...(req.isAdmin ? {} : { userId: req.user.id }),
            },
            select: { id: true, pdfUrl: true, userId: true, slipType: true },
        });

        if (!report) {
            return res.status(404).json({ error: 'NIN slip not found or access denied' });
        }

        if (!report.pdfUrl) {
            return res.status(404).json({ error: 'PDF not available for this slip' });
        }

        await streamSlip(res, report.pdfUrl, `nin_${report.slipType || 'slip'}_${report.id}.pdf`);
    } catch (error) {
        console.error('NIN slip download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download slip' });
        }
    }
});

/**
 * GET /api/slips/bvn/:reportId/download
 * Stream a BVN slip PDF — authenticated, ownership-verified.
 */
router.get('/bvn/:reportId/download', authenticateAny, async (req, res) => {
    try {
        const reportId = parseInt(req.params.reportId, 10);
        if (isNaN(reportId)) {
            return res.status(400).json({ error: 'Invalid report ID' });
        }

        const report = await prisma.bvnReport.findFirst({
            where: {
                id: reportId,
                ...(req.isAdmin ? {} : { userId: req.user.id }),
            },
            select: { id: true, pdfUrl: true, userId: true, slipType: true },
        });

        if (!report) {
            return res.status(404).json({ error: 'BVN slip not found or access denied' });
        }

        if (!report.pdfUrl) {
            return res.status(404).json({ error: 'PDF not available for this slip' });
        }

        await streamSlip(res, report.pdfUrl, `bvn_${report.slipType || 'slip'}_${report.id}.pdf`);
    } catch (error) {
        console.error('BVN slip download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download slip' });
        }
    }
});

/**
 * GET /api/slips/by-ref/:reference/download
 * Stream a slip PDF by transaction reference — authenticated, ownership-verified.
 */
router.get('/by-ref/:reference/download', authenticateAny, async (req, res) => {
    try {
        const { reference } = req.params;

        // Verify transaction ownership
        const transaction = await prisma.transaction.findFirst({
            where: {
                reference,
                ...(req.isAdmin ? {} : { userId: req.user.id }),
            },
            select: { id: true, userId: true },
        });

        if (!transaction && !req.isAdmin) {
            return res.status(404).json({ error: 'Transaction not found or access denied' });
        }

        // Check NIN reports first
        let r2KeyOrPath = null;
        let filename = `slip_${reference}.pdf`;

        const ninReport = await prisma.ninReport.findUnique({
            where: { transactionRef: reference },
            select: { id: true, pdfUrl: true, slipType: true },
        });
        if (ninReport?.pdfUrl) {
            r2KeyOrPath = ninReport.pdfUrl;
            filename = `nin_${ninReport.slipType || 'slip'}_${reference}.pdf`;
        }

        // Fallback to BVN reports
        if (!r2KeyOrPath) {
            const bvnReport = await prisma.bvnReport.findUnique({
                where: { transactionRef: reference },
                select: { id: true, pdfUrl: true, slipType: true },
            });
            if (bvnReport?.pdfUrl) {
                r2KeyOrPath = bvnReport.pdfUrl;
                filename = `bvn_${bvnReport.slipType || 'slip'}_${reference}.pdf`;
            }
        }

        if (!r2KeyOrPath) {
            return res.status(404).json({ error: 'No slip found for this transaction' });
        }

        await streamSlip(res, r2KeyOrPath, filename);
    } catch (error) {
        console.error('Slip download by ref error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download slip' });
        }
    }
});

module.exports = router;
