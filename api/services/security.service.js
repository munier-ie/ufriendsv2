const prisma = require('../../prisma/client');
const { metadata } = require('./securityContext');
const { sendWalletCreditAlert, sendFraudAlert } = require('./email.service');

async function event(tx, data, notify = false) {
    const record = await tx.securityEvent.create({ data: { metadata: metadata(), ...data } });
    if (notify) await tx.securityOutbox.create({ data: { eventId: record.id } });
    return record;
}

async function hold(userId, reason, source = 'validation', tx = null) {
    const run = async db => {
        await db.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return;
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
    }).catch(err => console.error('[Security] Failed to create SecurityEvent for credit:', err.message));

    // 3. Post-credit alerts and automated fraud surveillance
    // Scheduled via setImmediate so the active funding transaction finishes committing first,
    // avoiding row lock contention and ensuring immediate account halt & session purge.
    setImmediate(async () => {
        try {
            const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
            if (!freshUser) return;

            // Notify Admin via Email
            sendWalletCreditAlert(freshUser, {
                amount: numAmount,
                source: type,
                reference,
                oldBalance: prevBal,
                newBalance: newBal,
                additionalInfo: description
            }).catch(err => console.error('[Security] Failed to send wallet credit email alert:', err.message));

            // Run automated fraud detection rules
            await checkFraudRules(freshUser, { amount: numAmount, type, reference, newBalance: newBal }, prisma);
        } catch (err) {
            console.error('[Security] Post-credit fraud check error:', err.message);
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

    try {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Fetch recent credits in last 24h
        const recentCredits = await db.walletCreditLog.findMany({
            where: {
                userId,
                createdAt: { gte: oneDayAgo }
            },
            select: { amount: true, createdAt: true, type: true }
        });

        const total24h = recentCredits.reduce((s, c) => s + c.amount, 0);

        // Rule 1: High-Value Single Credit (>= ₦10,000 -> HALT; >= ₦5,000 -> ALERT)
        if (amount >= 10000) {
            const reason = `High-Value Single Funding: Wallet credited ₦${amount.toLocaleString()} via ${creditEvent.type}. Exceeds ₦10,000 threshold.`;
            console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
            await hold(userId, reason, 'fraud_single_credit_threshold', db);
            await sendFraudAlert(user, {
                ruleTriggered: 'High-Value Single Credit (>= ₦10,000)',
                severity: 'critical',
                description: `${reason} Account halted until admin notice.`,
                actionTaken: 'Account halted until admin notice'
            });
            return { triggered: true, rule: 'SINGLE_CREDIT_HALT', action: 'HALT' };
        } else if (amount >= 5000) {
            const reason = `Moderate-Value Single Funding: Wallet credited ₦${amount.toLocaleString()} via ${creditEvent.type}. High-risk surveillance triggered.`;
            console.warn(`[FRAUD ALERT] User #${userId}: ${reason}`);
            await sendFraudAlert(user, {
                ruleTriggered: 'High-Risk Single Credit (>= ₦5,000)',
                severity: 'high',
                description: reason,
                actionTaken: 'Flagged for admin surveillance'
            });
        }

        // Rule 2: Exceeded Daily Account Limit (Default ₦50,000)
        const limit = user.accountLimit || 50000;
        if (total24h > limit) {
            const reason = `Daily Account Limit Exceeded: 24h credits of ₦${total24h.toLocaleString()} exceed configured limit of ₦${limit.toLocaleString()}.`;
            console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
            await hold(userId, reason, 'fraud_daily_limit_exceeded', db);
            await sendFraudAlert(user, {
                ruleTriggered: `Account Daily Limit Exceeded (>₦${limit.toLocaleString()})`,
                severity: 'critical',
                description: `${reason} Account halted until admin notice.`,
                actionTaken: 'Account halted until admin notice'
            });
            return { triggered: true, rule: 'LIMIT_EXCEEDED_HALT', action: 'HALT' };
        }

        // Rule 3: Fresh Account High Volume (Account <24h old with >= ₦10,000 total credits)
        const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
        const isFreshAccount = accountAgeMs < 24 * 60 * 60 * 1000;

        if (isFreshAccount && total24h >= 10000) {
            const reason = `Fresh Account High Volume: Account registered <24h ago has received ₦${total24h.toLocaleString()} across ${recentCredits.length} credits. Exceeds ₦10,000 new account threshold.`;
            console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
            await hold(userId, reason, 'fraud_fresh_account_rule', db);
            await sendFraudAlert(user, {
                ruleTriggered: 'Fresh Account High Volume (<24h with >= ₦10,000)',
                severity: 'critical',
                description: `${reason} Account halted until admin notice.`,
                actionTaken: 'Account halted until admin notice'
            });
            return { triggered: true, rule: 'FRESH_ACCOUNT_HALT', action: 'HALT' };
        }

        // Rule 4: High Velocity — 3 or more credits in last 10 minutes
        const creditsLast10Mins = recentCredits.filter(c => c.createdAt >= tenMinsAgo);
        if (creditsLast10Mins.length >= 3) {
            const reason = `Rapid Velocity Alert: ${creditsLast10Mins.length} wallet credits within 10 minutes (Total: ₦${creditsLast10Mins.reduce((s, c) => s + c.amount, 0).toLocaleString()}).`;
            console.warn(`[FRAUD HALT] User #${userId}: ${reason}`);
            await hold(userId, reason, 'fraud_velocity_rule', db);
            await sendFraudAlert(user, {
                ruleTriggered: 'Rapid Funding Velocity (>=3 in 10 mins)',
                severity: 'critical',
                description: `${reason} Account halted until admin notice.`,
                actionTaken: 'Account halted until admin notice'
            });
            return { triggered: true, rule: 'RAPID_VELOCITY_HALT', action: 'HALT' };
        }

        return { triggered: false };
    } catch (err) {
        console.error('[FraudEngine] Error evaluating rules:', err);
        return { triggered: false, error: err.message };
    }
}

/**
 * Check Purchase / Vending Velocity (Automated Vending Bot Detection)
 * Detects automated bot draining: 5 to 10 purchases within 5 minutes.
 */
async function checkVendingVelocity(userId) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDebits = await prisma.transaction.count({
        where: {
            userId,
            date: { gte: fiveMinutesAgo }
        }
    });

    // 5 or more transactions in 5 minutes triggers bot protection
    if (recentDebits >= 5) {
        const reason = `Automated Vending Bot Detected: ${recentDebits} transactions attempted within 5 minutes.`;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            await hold(userId, reason, 'vending_bot_rule');
            await sendFraudAlert(user, {
                ruleTriggered: 'Automated Vending Bot (5-10 purchases in 5 mins)',
                severity: 'critical',
                description: `${reason} Account halted until admin notice.`,
                actionTaken: 'Account halted until admin notice'
            });
        }
        return { allowed: false, reason: 'Account suspended for security review: Automated vending bot pattern detected (5+ requests in 5 minutes).' };
    }

    return { allowed: true };
}

/**
 * Check Rapid High-Value Transactions (>= ₦2,000)
 * Detects multiple transactions of >= ₦2,000 in quick succession within 5 minutes.
 */
async function checkRapidHighValueTransactions(userId, currentAmount) {
    const numAmount = parseFloat(currentAmount) || 0;
    if (numAmount < 2000) {
        return { allowed: true };
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentHighValueDebits = await prisma.transaction.count({
        where: {
            userId,
            amount: { gte: 2000 },
            date: { gte: fiveMinutesAgo }
        }
    });

    // If there is already at least 1 other >= ₦2,000 transaction in the last 5 minutes, this is rapid drainage
    if (recentHighValueDebits >= 1) {
        const reason = `Rapid High-Value Transactions: Multiple transactions >= ₦2,000 attempted within 5 minutes (attempting ₦${numAmount.toLocaleString()}).`;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
            await hold(userId, reason, 'rapid_high_value_transactions');
            await sendFraudAlert(user, {
                ruleTriggered: 'Rapid Transactions Above ₦2,000 (Multiple in 5 mins)',
                severity: 'critical',
                description: `${reason} Account halted until admin notice.`,
                actionTaken: 'Account halted until admin notice'
            });
        }
        return { allowed: false, reason: 'Account suspended for security review: Multiple high-value transactions (>₦2,000) within 5 minutes.' };
    }

    return { allowed: true };
}

async function rejectManipulation(req, res, next) {
    const b = req.body || {};
    const negative = typeof b.quantity === 'number' && b.quantity < 0 || typeof b.amount === 'number' && b.amount < 0;
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
