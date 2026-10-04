const prisma = require('../../prisma/client');
const crypto = require('node:crypto');
const { metadata } = require('./securityContext');

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
        if (previous.userId !== userId || previous.source !== source || previous.amount !== (direction === 'credit' ? units : -units) / 100) throw new Error('Wallet operation conflict');
        return user;
    }
    const before = user[field];
    if (!Number.isFinite(before) || (direction === 'debit' && before < 0)) throw new Error('Wallet requires reconciliation');
    const balanceUnits = Math.round(before * 100);
    if (!Number.isSafeInteger(balanceUnits) || Math.abs(before * 100 - balanceUnits) > 0.0001) throw new Error('Wallet requires reconciliation');
    if (direction === 'debit' && balanceUnits < units) throw new Error('Insufficient wallet balance');
    const after = (balanceUnits + (direction === 'credit' ? units : -units)) / 100;
    if (!Number.isSafeInteger(Math.round(after * 100))) throw new Error('Invalid wallet balance');
    const meta = metadata();
    const ctx = JSON.stringify({ userId, field, source, reference, operationId, direction, amount: units / 100, adminId: meta.actorType === 'admin' ? meta.actorId : null, metadata: meta });
    await tx.$queryRaw`SELECT set_config('ufriends.wallet_context', ${ctx}, true)`;
    const updated = await tx.user.update({ where: { id: userId }, data: { [field]: after } });
    await tx.$queryRaw`SELECT set_config('ufriends.wallet_context', '', true)`;
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
    // Refund only a provable debit recorded after the security cutover.
    const debits = await tx.securityEvent.findMany({ where: { userId: original.userId, reference, kind: 'wallet_debit' } });
    const paid = debits.reduce((n, e) => n + kobo(-e.amount), 0);
    if (!paid || original.amount >= 0) throw new Error('No verified debit; manual reconciliation required');
    const already = kobo(original.refundedAmount, { allowZero: true });
    const target = amount === undefined ? paid : kobo(amount, { allowZero: true });
    if (target > paid) throw new Error('Refund exceeds original debit');
    if (target <= already) return { alreadyProcessed: true, user: await tx.user.findUnique({ where: { id: original.userId } }) };
    const delta = (target - already) / 100;
    const refundRef = `REFUND-${original.id}-${target}`;
    const user = await credit(tx, original.userId, delta, { source: 'refund', reference, operationId: refundRef });
    await tx.transaction.update({ where: { id: original.id }, data: { status: 2, refundedAmount: target / 100 } });
    await tx.transaction.create({ data: { reference: refundRef, userId: original.userId, serviceName: 'Wallet Refund', description: `${reason} (${reference})`, type: 'refund', amount: delta, status: 0, oldBalance: user.wallet - delta, newBalance: user.wallet } });
    return { user, amount: delta };
}
const refund = (reference, reason, amount) => prisma.$transaction(tx => refundInTransaction(tx, reference, reason, amount));
module.exports = { kobo, money, lockUser, debit, credit, refund, refundInTransaction };
