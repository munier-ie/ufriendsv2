const prisma = require('../../prisma/client');
const walletOps = require('./wallet.service');
const { event } = require('./security.service');

async function pending(transaction, reason) {
    await prisma.$transaction(async tx => {
        await walletOps.lockUser(tx, transaction.userId);
        const original = await tx.transaction.findUnique({ where: { id: transaction.id } });
        if (!original || original.refundedAmount > 0) return;
        await tx.transaction.update({ where: { id: original.id }, data: { status: 1 } });
        await event(tx, {
            kind: 'provider_reconciliation', severity: 'critical', userId: original.userId,
            source: 'vending', reference: original.reference, metadata: { reason }
        }, true);
    });
    return { status: 'pending', message: 'Transaction requires confirmation. Please do not repeat this purchase.' };
}

async function execute(transaction, providerId, send) {
    const attempt = await prisma.$transaction(async tx => {
        await walletOps.lockUser(tx, transaction.userId, true);
        const original = await tx.transaction.findUnique({ where: { id: transaction.id } });
        if (!original || original.userId !== transaction.userId || original.reference !== transaction.reference || original.amount >= 0 || original.refundedAmount > 0) {
            throw new Error('A provider purchase requires an unrefunded debit');
        }
        const debits = await tx.securityEvent.findMany({ where: { userId: original.userId, reference: original.reference, kind: 'wallet_debit', operationId: { not: null } } });
        const paid = debits.reduce((total, debit) => total + walletOps.kobo(-debit.amount), 0);
        if (paid !== walletOps.kobo(-original.amount)) throw new Error('Provider purchase has no matching audited debit');
        const previous = await tx.providerAttempt.findMany({ where: { transactionId: original.id } });
        if (previous.some(item => item.providerId === providerId || item.status !== 'failed')) return null;
        return tx.providerAttempt.create({ data: { transactionId: original.id, providerId, reference: original.reference, status: 'pending' } });
    });
    if (!attempt) return { status: 'pending', message: 'This transaction was already submitted. Await confirmation.' };

    let result;
    try {
        result = await send();
    } catch (error) {
        return pending(transaction, 'Provider connection failed after submission; delivery is unknown.');
    }
    const isTransportError = Boolean(
        result.isConnectionError === true ||
        /ECONNRESET|ETIMEDOUT|ECONNABORTED|ESOCKETTIMEDOUT|ENETUNREACH|EPIPE|EHOSTUNREACH/i.test(String(result.error || result.errorCode || '')) ||
        (!result.hasResponse && /timeout|timed out|socket hang up|connection refused|connection reset|provider connection error|econnreset|etimedout/i.test(String(result.message || result.error || '')))
    );
    const uncertain = !result || !['success', 'failed', 'pending'].includes(result.status)
        || (result.status === 'failed' && isTransportError);
    if (uncertain) return pending(transaction, 'Provider response did not confirm delivery or rejection.');
    await prisma.providerAttempt.update({ where: { id: attempt.id }, data: { status: result.status } });
    if (result.status === 'pending') return pending(transaction, 'Provider reports that delivery is still pending.');
    return result;
}

async function reconcile(transactionId, { adminId, outcome, reason, providerReference }) {
    const reject = message => { throw Object.assign(new Error(message), { code: 'RECONCILIATION_REJECTED' }); };
    if (!adminId || !['delivered', 'failed'].includes(outcome) || typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 1000 || typeof providerReference !== 'string' || !providerReference.trim() || providerReference.length > 200) {
        reject('Provide a confirmed provider outcome, provider reference and an explicit reason.');
    }
    return prisma.$transaction(async tx => {
        const initial = await tx.transaction.findUnique({ where: { id: transactionId } });
        if (!initial) reject('Transaction not found');
        await walletOps.lockUser(tx, initial.userId);
        const original = await tx.transaction.findUnique({ where: { id: transactionId } });
        const attempts = await tx.providerAttempt.findMany({ where: { transactionId } });
        if (original.refundedAmount > 0 || !attempts.some(attempt => attempt.status === 'pending')) reject('No unresolved provider attempt is eligible for reconciliation');
        if (outcome === 'failed' && attempts.some(attempt => attempt.status === 'success')) reject('A confirmed successful delivery cannot be refunded');
        await tx.providerAttempt.updateMany({ where: { transactionId, status: 'pending' }, data: { status: outcome === 'delivered' ? 'success' : 'failed' } });
        if (outcome === 'failed') {
            await walletOps.refundInTransaction(tx, original.reference, `Provider failure confirmed by admin ${adminId}: ${reason.trim()}`);
        } else {
            await tx.transaction.update({ where: { id: transactionId }, data: { status: 0 } });
        }
        const updated = await tx.transaction.findUnique({ where: { id: transactionId } });
        await tx.transactionStatusUpdate.create({ data: {
            transactionId, adminId, oldStatus: original.status, newStatus: updated.status,
            reason: reason.trim(), refunded: outcome === 'failed'
        } });
        await event(tx, {
            kind: 'provider_reconciliation_resolved', severity: 'warning', userId: original.userId,
            adminId, source: 'admin_provider_reconciliation', reference: original.reference,
            metadata: { outcome, reason: reason.trim(), providerReference: providerReference.trim(), attemptIds: attempts.map(attempt => attempt.id) }
        }, true);
        return updated;
    });
}

module.exports = { execute, pending, reconcile };
