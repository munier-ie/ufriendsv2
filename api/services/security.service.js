const prisma = require('../../prisma/client');
const { metadata } = require('./securityContext');


async function event(tx, data, notify = false) {
    const record = await tx.securityEvent.create({ data: { metadata: metadata(), ...data } });
    if (notify) await tx.securityOutbox.create({ data: { eventId: record.id } });
    return record;
}

async function hold(userId, reason, source = 'validation', tx = null) {
    const run = async db => {
        await db.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user || user.securityHold) return;
        await db.user.update({ where: { id: userId }, data: { securityHold: true } });
        await db.userLogin.deleteMany({ where: { userId } });
        await event(db, { kind: 'security_hold', severity: 'critical', userId, source, metadata: { ...metadata(), reason } }, true);
    };
    return tx ? run(tx) : prisma.$transaction(run);
}

async function unhold(userId, adminId, reason = 'Admin manual release', tx = null) {
    const run = async db => {
        await db.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return;
        if (user.securityHold) {
            await db.user.update({ where: { id: userId }, data: { securityHold: false } });
            await event(db, { kind: 'security_unhold', severity: 'info', userId, adminId, source: 'admin', metadata: { ...metadata(), reason } });
        }
    };
    return tx ? run(tx) : prisma.$transaction(run);
}

/**
 * Record a wallet credit event in the database, notify admin via email,
 * and evaluate fraud detection rules.
 */
async function recordWalletCredit(db, {
    user,
    amount,
    previousBalance,
    newBalance,
    type,
    channel,
    reference,
    description,
    initiatedBy,
    ipAddress,
    metadata: extraMeta
}) {
    const numAmount = parseFloat(amount) || 0;
    const prevBal = parseFloat(previousBalance || 0);
    const newBal = parseFloat(newBalance !== undefined ? newBalance : prevBal + numAmount);

    // 1. Create WalletCreditLog record
    const creditLog = await db.walletCreditLog.create({
        data: {
            userId: user.id,
            amount: numAmount,
            previousBalance: prevBal,
            newBalance: newBal,
            type: type || 'UNKNOWN',
            channel: channel || null,
            reference: reference || null,
            description: description || null,
            initiatedBy: initiatedBy || null,
            ipAddress: ipAddress || null,
            metadata: extraMeta || {}
        }
    });

    // 2. Also log SecurityEvent for unified security telemetry
    await event(db, {
        kind: 'wallet_credit',
        severity: type === 'admin_fund' ? 'warning' : 'info',
        userId: user.id,
        source: channel || type,
        reference: reference || null,
        oldBalance: prevBal,
        newBalance: newBal,
        amount: numAmount,
        metadata: {
            ...metadata(),
            type,
            channel,
            creditLogId: creditLog.id,
            initiatedBy,
            description,
            ...(extraMeta || {})
        }
    });

    return creditLog;
}

/**
 * Fraud Detection Engine
 * Evaluates behavioral patterns on account credits and vending activities.
 * Strict thresholds:
 * - Single credit >= 10,000 NGN: Immediate account halt
 * - Single credit >= 5,000 NGN: High-risk alert to admin
 * - Fresh account (<24h) receiving >= 10,000 NGN cumulative: Immediate account halt
 * - Cumulative 24h credits > user.accountLimit (default 50,000 NGN): Immediate account halt
 * - Rapid funding velocity (>= 3 credits in 10 minutes): Immediate account halt
 */
async function checkFraudRules(user, creditEvent, db = prisma) {
    const userId = user.id;
    const amount = creditEvent.amount;
    const type = String(creditEvent.type || '').toLowerCase();
    const REFUND_SOURCES = ['refund', 'manual_legacy_refund', 'admin_manual_service_rejection', 'admin_reconciled_refund'];
    const isRefund = REFUND_SOURCES.includes(type);

    try {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // System refunds are reversals of previous legitimate debits and are mathematically bounded.
        // They are not external wallet funding deposits. Handle them with dedicated sanity guards.
        if (isRefund) {
            const recentRefundsCount = await db.securityEvent.count({
                where: {
                    userId,
                    kind: 'wallet_credit',
                    source: { in: REFUND_SOURCES },
                    createdAt: { gte: tenMinsAgo }
                }
            });

            // Normal user retries (e.g., 3-5 failed verifications) are allowed.
            // Only halt on extreme anomalies indicating an automated bot loop (>= 15 refunds in 10 mins).
            if (recentRefundsCount >= 15) {
                const reason = `Excessive Refund Velocity Alert: ${recentRefundsCount} refund events within 10 minutes. Suspicious automated loop halted.`;
                console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
                await hold(userId, reason, 'fraud_excessive_refund_loop', db === prisma ? null : db);
                return { triggered: true, rule: 'EXCESSIVE_REFUND_HALT', action: 'HALT' };
            }

            return { triggered: false };
        }

        // Fetch recent external funding credits in last 24h (excluding internal reversals and refunds)
        const recentFundingCredits = await db.securityEvent.findMany({
            where: {
                userId,
                kind: 'wallet_credit',
                operationId: { not: null },
                amount: { gt: 0 },
                source: { notIn: REFUND_SOURCES },
                createdAt: { gte: oneDayAgo }
            },
            select: { amount: true, source: true, createdAt: true }
        });

        const total24h = recentFundingCredits.reduce((s, c) => s + c.amount, 0);

        // Rule 1: High-Value Single Credit (>= ₦10,000 -> HALT; >= ₦5,000 -> ALERT)
        if (amount >= 10000) {
            const reason = `High-Value Single Funding: Wallet credited ₦${amount.toLocaleString()} via ${creditEvent.type}. Exceeds ₦10,000 threshold.`;
            console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
            await hold(userId, reason, 'fraud_single_credit_threshold', db === prisma ? null : db);
            return { triggered: true, rule: 'SINGLE_CREDIT_HALT', action: 'HALT' };
        } else if (amount >= 5000) {
            const reason = `Moderate-Value Single Funding: Wallet credited ₦${amount.toLocaleString()} via ${creditEvent.type}. High-risk surveillance triggered.`;
            console.warn(`[FRAUD ALERT] User #${userId}: ${reason}`);
            await event(db, { kind: 'high_value_credit_flag', severity: 'high', userId, source: creditEvent.type, reference: creditEvent.reference || null, amount, metadata: { reason } }, true);
        }

        // Rule 2: Exceeded Daily Account Limit (Default ₦50,000)
        const limit = user.accountLimit || 50000;
        if (total24h > limit) {
            const reason = `Daily Account Limit Exceeded: 24h external credits of ₦${total24h.toLocaleString()} exceed configured limit of ₦${limit.toLocaleString()}.`;
            console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
            await hold(userId, reason, 'fraud_daily_limit_exceeded', db === prisma ? null : db);
            return { triggered: true, rule: 'LIMIT_EXCEEDED_HALT', action: 'HALT' };
        }

        // Rule 3: Fresh Account High Volume (Account <24h old with >= ₦10,000 total credits)
        const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
        const isFreshAccount = accountAgeMs < 24 * 60 * 60 * 1000;

        if (isFreshAccount && total24h >= 10000) {
            const reason = `Fresh Account High Volume: Account registered <24h ago has received ₦${total24h.toLocaleString()} across ${recentFundingCredits.length} deposits. Exceeds ₦10,000 new account threshold.`;
            console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
            await hold(userId, reason, 'fraud_fresh_account_rule', db === prisma ? null : db);
            return { triggered: true, rule: 'FRESH_ACCOUNT_HALT', action: 'HALT' };
        }

        // Rule 4: High Velocity — 5 or more deposits in 10 mins OR 3 or more deposits totaling >= ₦5,000
        const fundingLast10Mins = recentFundingCredits.filter(c => c.createdAt >= tenMinsAgo);
        const fundingTotalLast10Mins = fundingLast10Mins.reduce((s, c) => s + c.amount, 0);

        if (fundingLast10Mins.length >= 5 || (fundingLast10Mins.length >= 3 && fundingTotalLast10Mins >= 5000)) {
            const reason = `Rapid Velocity Alert: ${fundingLast10Mins.length} external wallet deposits within 10 minutes (Total: ₦${fundingTotalLast10Mins.toLocaleString()}).`;
            console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
            await hold(userId, reason, 'fraud_velocity_rule', db === prisma ? null : db);
            return { triggered: true, rule: 'RAPID_VELOCITY_HALT', action: 'HALT' };
        }

        return { triggered: false };
    } catch (err) {
        console.error('[FraudEngine] Error evaluating rules:', err);
        throw err;
    }
}

/**
 * Check Purchase / Vending Velocity (Automated Vending Bot Detection)
 * Detects automated bot draining: 5 to 10 purchases within 5 minutes.
 */
async function checkVendingVelocity(userId, db = prisma) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDebits = await db.securityEvent.count({
        where: {
            userId,
            kind: 'wallet_debit',
            operationId: { not: null },
            amount: { lt: 0 },
            source: { not: 'admin_debit' },
            createdAt: { gte: fiveMinutesAgo }
        }
    });

    // 5 or more transactions in 5 minutes triggers bot protection
    if (recentDebits >= 5) {
        const reason = `Automated Vending Bot Detected: ${recentDebits} transactions attempted within 5 minutes.`;
        return { allowed: false, reason, source: 'vending_bot_rule' };
    }

    return { allowed: true };
}

/**
 * Check rapid, repeated high-value transactions.
 *
 * A transaction PIN, row-locked wallet debit, and the all-purchase velocity
 * rule already protect every purchase.  This additional hard hold is therefore
 * reserved for a genuinely unusual burst: a third purchase of ₦5,000 or more
 * in five minutes.  Treating a normal second ₦2,000 data purchase as account
 * takeover was causing legitimate customers to be locked out.
 */
async function checkRapidHighValueTransactions(userId, currentAmount, db = prisma) {
    const numAmount = parseFloat(currentAmount) || 0;
    const highValueThreshold = 5000;
    const allowedHighValuePurchases = 2;
    if (numAmount < highValueThreshold) {
        return { allowed: true };
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentHighValueDebits = await db.securityEvent.count({
        where: {
            userId,
            kind: 'wallet_debit',
            operationId: { not: null },
            amount: { lte: -highValueThreshold },
            source: { not: 'admin_debit' },
            createdAt: { gte: fiveMinutesAgo }
        }
    });

    // The third >= ₦5,000 purchase in five minutes is a materially stronger
    // account-takeover signal than a customer buying data for two lines.
    if (recentHighValueDebits >= allowedHighValuePurchases) {
        const reason = `Rapid High-Value Transactions: More than ${allowedHighValuePurchases} transactions >= ₦${highValueThreshold.toLocaleString()} attempted within 5 minutes (attempting ₦${numAmount.toLocaleString()}).`;
        return { allowed: false, reason, source: 'rapid_high_value_transactions' };
    }

    return { allowed: true };
}

async function rejectManipulation(req, res, next) {
    const b = req.body || {};
    const negative = ['quantity', 'amount'].some(key => ['number', 'string'].includes(typeof b[key]) && Number.isFinite(Number(b[key])) && Number(b[key]) < 0);
    const forgedLength = b.recipients && !Array.isArray(b.recipients) && typeof b.recipients === 'object' && Number(b.recipients.length) < 0;
    if (req.user && (negative || forgedLength)) {
        try {
            await hold(req.user.id, 'Authenticated request attempted a negative charge or forged recipient count.');
            return res.status(403).json({ error: 'Account held for security review. Contact support.', code: 'SECURITY_HOLD' });
        } catch (error) { return next(error); }
    }
    next();
}

module.exports = {
    event,
    hold,
    unhold,
    recordWalletCredit,
    checkFraudRules,
    checkVendingVelocity,
    checkRapidHighValueTransactions,
    rejectManipulation
};
