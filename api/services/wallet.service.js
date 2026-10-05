const prisma = require('../../prisma/client');
const crypto = require('node:crypto');
const { metadata } = require('./securityContext');

async function transaction(work, options) {
    try {
        return await prisma.$transaction(work, options);
    } catch (error) {
        if (error.code === 'SECURITY_HOLD' && error.userId) {
            const { hold } = require('./security.service');
            await hold(error.userId, error.message, error.source);
        }
        throw error;
    }
}

function kobo(value, { allowZero = false } = {}) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) throw new Error('Invalid monetary amount');
    const result = Math.round((value + Number.EPSILON) * 100);
    if (!Number.isSafeInteger(result) || (!allowZero && result < 1)) throw new Error('Invalid monetary amount');
    return result;
}
const money = value => kobo(value) / 100;

async function lockUser(tx, userId, spending = false) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (spending && (user.securityHold || user.regStatus !== 0)) throw new Error('Account blocked or held for security review');
    return user;
}

async function change(tx, userId, amount, { direction, source, reference = null, operationId = crypto.randomUUID(), field = 'wallet' } = {}) {
    if (!['debit', 'credit'].includes(direction) || !['wallet', 'refWallet'].includes(field) || !source) throw new Error('Wallet operation context required');
    const units = kobo(amount);
    const user = await lockUser(tx, userId, direction === 'debit');
    const previous = await tx.securityEvent.findUnique({ where: { operationId } });
    if (previous) {
        if (previous.userId !== userId || previous.source !== source || previous.reference !== reference || previous.metadata?.wallet !== field || Math.round(previous.amount * 100) !== (direction === 'credit' ? units : -units)) throw new Error('Wallet operation conflict');
        return user;
    }
    if (direction === 'debit' && field === 'wallet' && source !== 'admin_debit') {
        const { checkVendingVelocity, checkRapidHighValueTransactions } = require('./security.service');
        const velocity = await checkVendingVelocity(userId, tx);
        const decision = velocity.allowed ? await checkRapidHighValueTransactions(userId, units / 100, tx) : velocity;
        if (!decision.allowed) {
            const error = new Error(decision.reason);
            Object.assign(error, { code: 'SECURITY_HOLD', userId, source: decision.source });
            throw error;
        }
    }
    const rawBefore = user[field] == null ? 0 : Number(user[field]);
    if (!Number.isFinite(rawBefore) || (direction === 'debit' && rawBefore < 0)) throw new Error('Wallet requires reconciliation');
    const balanceUnits = Math.round((rawBefore + Number.EPSILON) * 100);
    if (!Number.isSafeInteger(balanceUnits)) throw new Error('Invalid wallet balance');
    if (direction === 'debit' && balanceUnits < units) throw new Error('Insufficient wallet balance');
    const afterUnits = balanceUnits + (direction === 'credit' ? units : -units);
    if (!Number.isSafeInteger(afterUnits)) throw new Error('Invalid wallet balance');
    const after = afterUnits / 100;
    const meta = metadata();
    const ctx = JSON.stringify({ userId, field, source, reference, operationId, direction, amount: units / 100, adminId: meta.actorType === 'admin' ? meta.actorId : null, metadata: meta });
    await tx.$queryRaw`SELECT set_config('ufriends.wallet_context', ${ctx}, true)`;
    const updated = await tx.user.update({ where: { id: userId }, data: { [field]: after } });
    await tx.$queryRaw`SELECT set_config('ufriends.wallet_context', '', true)`;
    const audit = await tx.securityEvent.findUnique({ where: { operationId } });
    if (!audit) throw new Error('Wallet audit missing; wallet operation aborted. Run npm run check:wallet-security and repair database triggers with npm run install:security-triggers');
    if (direction === 'credit') {
        await tx.securityOutbox.upsert({ where: { eventId: audit.id }, create: { eventId: audit.id }, update: {} });
        if (field === 'wallet') {
            const { checkFraudRules } = require('./security.service');
            await checkFraudRules(updated, { amount: units / 100, type: source, reference, newBalance: after }, tx);
            return tx.user.findUnique({ where: { id: userId } });
        }
    }
    return updated;
}
const debit = (tx, userId, amount, options) => change(tx, userId, amount, { ...options, direction: 'debit' });
const credit = (tx, userId, amount, options) => change(tx, userId, amount, { ...options, direction: 'credit' });

async function refundInTransaction(tx, reference, reason, amount) {
    const transaction = await tx.transaction.findUnique({ where: { reference } });
    if (!transaction) throw new Error('Original transaction not found');
    await lockUser(tx, transaction.userId);
    await tx.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${transaction.id} FOR UPDATE`;
    const original = await tx.transaction.findUnique({ where: { reference } });
    const unresolvedAttempt = await tx.providerAttempt.findFirst({ where: { transactionId: original.id, status: { not: 'failed' } } });
    if (unresolvedAttempt) throw new Error('Provider delivery must be reconciled before refunding');
    // Refund only a provable debit recorded after the security cutover.
    const debits = await tx.securityEvent.findMany({ where: { userId: original.userId, reference, kind: 'wallet_debit' } });
    const paid = debits.reduce((n, e) => n + kobo(-e.amount), 0);
    if (!paid || original.amount >= 0) throw new Error('No verified debit; manual reconciliation required');
    const already = kobo(original.refundedAmount, { allowZero: true });
    const target = amount === undefined ? paid : kobo(amount, { allowZero: true });
    if (target > paid || target > kobo(Math.abs(original.amount))) throw new Error('Refund exceeds original debit');
    if (target <= already) return { alreadyProcessed: true, user: await tx.user.findUnique({ where: { id: original.userId } }) };
    const delta = (target - already) / 100;
    const refundRef = `REFUND-${original.id}-${target}`;
    const user = await credit(tx, original.userId, delta, { source: 'refund', reference, operationId: refundRef });
    await tx.transaction.update({ where: { id: original.id }, data: { status: target === paid ? 3 : 2, refundedAmount: target / 100 } });
    await tx.transaction.create({ data: { reference: refundRef, userId: original.userId, serviceName: 'Wallet Refund', description: `${reason} (${reference})`, type: 'refund', amount: delta, status: 0, oldBalance: user.wallet - delta, newBalance: user.wallet } });
    const { recordWalletCredit } = require('./security.service');
    const fullUser = await tx.user.findUnique({ where: { id: original.userId } });
    await recordWalletCredit(tx, { user: fullUser, amount: delta, previousBalance: user.wallet - delta, newBalance: user.wallet, type: 'REFUND', channel: 'refund', reference: refundRef, description: reason, initiatedBy: 'SYSTEM' });
    return { user, amount: delta };
}

// Exceptional path for pre-ledger transactions. This records that the debit could
// not be independently proved, and requires an authenticated admin and reason.
async function manualLegacyRefundInTransaction(tx, reference, { adminId, adminName, reason, amount }) {
    const cleanReason = String(reason || '').trim();
    if (!adminId || cleanReason.length < 10 || cleanReason.length > 1000) throw new Error('A reason of at least 10 characters is required');
    const transaction = await tx.transaction.findUnique({ where: { reference } });
    if (!transaction) throw new Error('Original transaction not found');
    await lockUser(tx, transaction.userId);
    await tx.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${transaction.id} FOR UPDATE`;
    const original = await tx.transaction.findUnique({ where: { reference } });
    if (!(original.amount < 0)) throw new Error('Manual legacy refund requires an original debit transaction');
    if (original.status === 3) throw new Error('Transaction is already marked refunded');
    const opening = await tx.securityEvent.findFirst({ where: { userId: original.userId, kind: 'opening_balance' }, orderBy: { createdAt: 'asc' } });
    if (!opening || original.date >= opening.createdAt) throw new Error('Only transactions before the audit cutover qualify for a legacy refund');
    const unresolvedAttempt = await tx.providerAttempt.findFirst({ where: { transactionId: original.id, status: { not: 'failed' } } });
    if (unresolvedAttempt) throw new Error('Provider delivery must be reconciled before refunding');
    const debits = await tx.securityEvent.findMany({ where: { userId: original.userId, reference, kind: 'wallet_debit' } });
    if (debits.some(event => event.amount < 0)) throw new Error('This transaction has audited debit evidence; use the standard refund process');
    const total = kobo(Math.abs(original.amount));
    const already = kobo(original.refundedAmount, { allowZero: true });
    const target = amount === undefined ? total : kobo(amount);
    if (target > total) throw new Error('Refund exceeds original transaction amount');
    if (already > total) throw new Error('Existing refund amount requires reconciliation');
    if (target <= already) throw new Error('No refundable balance remains');
    const delta = (target - already) / 100;
    const refundRef = `MANUAL-LEGACY-REFUND-${original.id}-${target}`;
    const user = await credit(tx, original.userId, delta, { source: 'manual_legacy_refund', reference, operationId: refundRef });
    await tx.transaction.update({ where: { id: original.id }, data: { status: 3, refundedAmount: target / 100 } });
    await tx.transaction.create({ data: { reference: refundRef, userId: original.userId, serviceName: 'Manual Legacy Refund', description: `${cleanReason} (original ${reference}; authorized by ${adminName || adminId})`, type: 'refund', amount: delta, status: 0, oldBalance: user.wallet - delta, newBalance: user.wallet } });
    const { recordWalletCredit } = require('./security.service');
    const fullUser = await tx.user.findUnique({ where: { id: original.userId } });
    await recordWalletCredit(tx, { user: fullUser, amount: delta, previousBalance: user.wallet - delta, newBalance: user.wallet, type: 'MANUAL_LEGACY_REFUND', channel: 'manual_legacy_refund', reference: refundRef, description: cleanReason, initiatedBy: 'ADMIN' });
    const event = await tx.securityEvent.create({ data: {
        kind: 'manual_legacy_refund', severity: 'critical', userId: original.userId, adminId,
        source: 'admin_manual_legacy_refund', reference: refundRef,
        oldBalance: user.wallet - delta, newBalance: user.wallet, amount: delta,
        metadata: { ...metadata(), originalReference: reference, reason: cleanReason, legacyDebitUnverified: true }
    } });
    await tx.securityOutbox.upsert({ where: { eventId: event.id }, create: { eventId: event.id }, update: {} });
    return { user, amount: delta, refundReference: refundRef };
}
const refund = (reference, reason, amount) => prisma.$transaction(tx => refundInTransaction(tx, reference, reason, amount));
module.exports = { kobo, money, lockUser, debit, credit, refund, refundInTransaction, manualLegacyRefundInTransaction, transaction };
