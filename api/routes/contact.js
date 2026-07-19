const express = require('express');
const router = express.Router();
const { z } = require('zod');
const prisma = require('../../prisma/client');
const { sendEmail } = require('../services/email.service');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limit: 3 contact form submissions per IP per 10 minutes
const contactLimiter = new RateLimiterMemory({ points: 3, duration: 600 });

const contactSchema = z.object({
    name:    z.string().trim().min(2, 'Name must be at least 2 characters'),
    email:   z.string().trim().email('Please enter a valid email address'),
    phone:   z.string().trim().optional(),
    subject: z.string().trim().min(5, 'Subject must be at least 5 characters'),
    message: z.string().trim().min(15, 'Message must be at least 15 characters'),
});

// POST /api/contact — Public, no auth required
router.post('/', async (req, res) => {
    // Rate limit by IP
    try {
        await contactLimiter.consume(req.ip);
    } catch {
        return res.status(429).json({ error: 'Too many requests. Please wait a few minutes before trying again.' });
    }

    const validation = contactSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const { name, email, phone, subject, message } = validation.data;

    // [SEC-HIGH-08] Sanitize user inputs before interpolating into HTML emails
    const escapeHtml = (str) => String(str).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const safeName    = escapeHtml(name);
    const safeEmail   = escapeHtml(email);
    const safePhone   = phone ? escapeHtml(phone) : '';
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    try {
        // 1. Save to DB
        await prisma.contactMessage.create({
            data: { name, email, subject, message, status: 0 },
        });

        // 2. Notify admin via email (fire-and-forget, doesn't block response)
        const phoneRow = safePhone ? `<tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">Phone</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;text-align:right;">${safePhone}</td></tr>` : '';
        const adminHtml = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#004687,#1e90ff);padding:28px 32px;">
                    <h2 style="color:#fff;margin:0;font-size:20px;">📬 New Contact Form Submission</h2>
                </div>
                <div style="padding:28px 32px;">
                    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                        <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">Name</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;text-align:right;">${safeName}</td></tr>
                        <tr><td style="padding:8px 12px;color:#666;border-bottom:1px solid #eee;">Email</td><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #eee;text-align:right;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
                        ${phoneRow}
                        <tr><td style="padding:8px 12px;color:#666;">Subject</td><td style="padding:8px 12px;font-weight:600;text-align:right;">${safeSubject}</td></tr>
                    </table>
                    <div style="background:#f8fafc;border-left:4px solid #1e90ff;border-radius:4px;padding:16px 20px;">
                        <p style="margin:0;color:#333;font-size:15px;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
                    </div>
                    <div style="margin-top:24px;text-align:center;">
                        <a href="${process.env.FRONTEND_URL || 'https://ufriends.com.ng'}/admin/dashboard/contact"
                           style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#004687,#1e90ff);color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
                            View in Dashboard
                        </a>
                    </div>
                </div>
                <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
                    © ${new Date().getFullYear()} Ufriends IT. All rights reserved.
                </div>
            </div>
        `;

        sendEmail(
            process.env.ADMIN_EMAIL,
            `[Contact Form] ${safeSubject} — from ${safeName}`,
            adminHtml
        );

        // 3. Send auto-reply to the user
        const userHtml = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#004687,#1e90ff);padding:28px 32px;">
                    <h2 style="color:#fff;margin:0;font-size:20px;">We got your message ✅</h2>
                </div>
                <div style="padding:28px 32px;">
                    <p style="color:#333;font-size:16px;">Hi <strong>${safeName}</strong>,</p>
                    <p style="color:#555;line-height:1.7;">Thank you for reaching out to Ufriends IT. We've received your message and our support team will get back to you within <strong>24 hours</strong>.</p>
                    <div style="background:#f0f7ff;border:1px dashed #1e90ff;border-radius:8px;padding:16px 20px;margin:24px 0;">
                        <p style="margin:0 0 6px 0;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Your message</p>
                        <p style="margin:0;color:#333;font-size:15px;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
                    </div>
                    <p style="color:#555;line-height:1.7;">If your matter is urgent, you can also reach us directly via WhatsApp for a faster response.</p>
                    <p style="color:#555;margin-top:24px;">Best regards,<br><strong>The Ufriends IT Support Team</strong></p>
                </div>
                <div style="background:#f8fafc;padding:16px 32px;text-align:center;font-size:12px;color:#94a3b8;">
                    © ${new Date().getFullYear()} Ufriends IT. All rights reserved.
                </div>
            </div>
        `;
        sendEmail(email, `We received your message — Ufriends IT`, userHtml);

        return res.status(201).json({
            success: true,
            message: 'Your message has been sent. We will get back to you within 24 hours.',
        });

    } catch (error) {
        console.error('Contact form error:', error);
        return res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
});

module.exports = router;
