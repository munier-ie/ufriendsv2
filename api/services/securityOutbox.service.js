const prisma = require('../../prisma/client');
const { randomUUID } = require('node:crypto');
const { sendEmailStrict } = require('./email.service');
const { safeError } = require('../utils/safeError');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let running = false;

async function deliver(row) {
    const event = row.event;
    const user = event.userId ? await prisma.user.findUnique({ where: { id: event.userId }, select: { id: true, firstName: true, lastName: true, email: true, phone: true } }) : null;
    const meta = event.metadata || {};
    const details = [
        ['Event', event.kind], ['Severity', event.severity], ['User', user ? `${user.firstName} ${user.lastName} (#${user.id})` : event.userId || 'System'],
        ['Email', user?.email || '—'], ['Phone', user?.phone || '—'], ['Source', event.source || '—'], ['Reference', event.reference || '—'],
        ['Admin', event.adminId || meta.actorId || '—'], ['Original reference', meta.originalReference || '—'], ['Provider reference', meta.providerReference || '—'],
        ['Amount', event.amount == null ? '—' : `₦${Number(event.amount).toLocaleString()}`],
        ['Balance', event.oldBalance == null || event.newBalance == null ? '—' : `₦${Number(event.oldBalance).toLocaleString()} → ₦${Number(event.newBalance).toLocaleString()}`],
        ['Reason', meta.reason || meta.description || (meta.changedFields || []).join(', ') || '—'],
        ['IP', meta.ip || '—'], ['Location', meta.location || 'Unavailable'], ['Device', meta.device || '—'],
        ['Browser', meta.browser || '—'], ['Operating system', meta.os || '—'], ['User agent', meta.userAgent || '—'], ['Time (UTC)', event.createdAt.toISOString()]
    ];
    const body = details.map(([label, value]) => `<tr><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#64748b;width:150px">${esc(label)}</td><td style="padding:9px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600">${esc(value)}</td></tr>`).join('');
    const subject = `[Ufriends Security] ${event.severity.toUpperCase()}: ${event.kind.replaceAll('_', ' ')}`;
    const html = `<div style="font:14px Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a"><div style="background:#0b3c68;padding:22px;color:white;border-radius:10px 10px 0 0"><h1 style="font-size:20px;margin:0">Security activity alert</h1><p style="margin:8px 0 0">Review this account event in the admin security events page.</p></div><table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0">${body}</table><p style="color:#64748b;font-size:12px;margin-top:18px">Automated Ufriends security notification. Do not reply to this email.</p></div>`;
    if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL_NOT_CONFIGURED');
    await sendEmailStrict(process.env.ADMIN_EMAIL, subject, html);
}

async function drain(limit = 20) {
    if (running) return;
    running = true;
    try {
        const now = new Date();
        const rows = await prisma.securityOutbox.findMany({
            where: { OR: [{ status: 'pending', availableAt: { lte: now } }, { status: 'processing', leaseUntil: { lt: now } }] },
            orderBy: { createdAt: 'asc' }, take: limit
        });
        for (const row of rows) {
            const securityEvent = await prisma.securityEvent.findUnique({ where: { id: row.eventId } });
            if (!securityEvent) {
                await prisma.securityOutbox.update({ where: { id: row.id }, data: { status: 'sent', acceptedAt: new Date(), lastError: 'Event record missing' } });
                continue;
            }
            const leaseUntil = new Date(Date.now() + 120000);
            const leaseToken = randomUUID();
            const claimed = await prisma.securityOutbox.updateMany({
                where: { id: row.id, status: row.status, ...(row.status === 'pending' ? { availableAt: { lte: now } } : { leaseUntil: { lt: now } }) },
                data: { status: 'processing', leaseUntil, leaseToken, attempts: { increment: 1 } }
            });
            if (!claimed.count) continue;
            try {
                await deliver({ ...row, event: securityEvent });
                await prisma.securityOutbox.updateMany({ where: { id: row.id, status: 'processing', leaseToken }, data: { status: 'sent', acceptedAt: new Date(), leaseUntil: null, leaseToken: null, lastError: null } });
            } catch (error) {
                const attempts = row.attempts + 1;
                const delay = Math.min(3600, 15 * (2 ** Math.min(attempts, 8)));
                await prisma.securityOutbox.updateMany({ where: { id: row.id, status: 'processing', leaseToken }, data: { status: 'pending', availableAt: new Date(Date.now() + delay * 1000), leaseUntil: null, leaseToken: null, lastError: String(error.code || error.name || 'DELIVERY_FAILED').slice(0, 80) } }).catch(e => console.error('[SecurityOutbox] Failed to schedule retry:', safeError(e)));
                console.error('[SecurityOutbox] Delivery failed; queued for retry:', safeError(error));
            }
        }
    } catch (error) { console.error('[SecurityOutbox] Drain failed:', safeError(error)); }
    finally { running = false; }
}

function start() {
    if (global.__ufriendsSecurityOutboxTimer) return;
    global.__ufriendsSecurityOutboxTimer = setInterval(() => drain().catch(err => console.error('[SecurityOutbox] Unexpected drain failure:', safeError(err))), 5000);
    global.__ufriendsSecurityOutboxTimer.unref?.();
    drain();
}

module.exports = { start, drain };
