const express = require('express');
const router = express.Router();
const { z } = require('zod');
const crypto = require('crypto');
const { sendTransactionReceipt, sendAdminAlert } = require('../services/email.service');
const prisma = require('../../prisma/client');
const monnifyService = require('../services/monnify.service');
const paymentpointService = require('../services/paymentpoint.service');
const { recordWalletCredit } = require('../services/security.service');
const walletOps = require('../services/wallet.service');

/**
 * @route   POST /api/webhooks/monnify
 * @desc    Handle Monnify payment notifications
 * @access  Public (but verified via signature)
 */
router.post('/monnify', async (req, res) => {
    try {
        const signature = req.headers['monnify-signature'];
        
        // Parse payload correctly protecting against express.raw buffers
        const rawBody = req.body;
        const payloadStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : (req.rawBody || JSON.stringify(rawBody));

        // Verify webhook signature with raw string
        let isValid = monnifyService.verifyWebhookSignature(signature, payloadStr);
        if (!isValid && !process.env.MONNIFY_SECRET_KEY) {
            const gw = await prisma.paymentGateway.findUnique({ where: { provider: 'MONNIFY' } });
            if (gw?.secretKey || gw?.apiKey) {
                isValid = monnifyService.verifyWebhookSignature(signature, payloadStr, gw.secretKey || gw.apiKey);
            }
        }
        if (!isValid) {
            console.error('Invalid Monnify webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const payloadObj = typeof rawBody === 'object' && !Buffer.isBuffer(rawBody) ? rawBody : JSON.parse(payloadStr);
        const { eventType, eventData } = payloadObj;

        // Only process successful transactions
        if (eventType === 'SUCCESSFUL_TRANSACTION') {
            const {
                transactionReference,
                paymentReference,
                amountPaid,
                paidOn,
                product
            } = eventData;

            if (!transactionReference || !product?.reference || !Number.isFinite(Number(amountPaid)) || Number(amountPaid) <= 0) {
                return res.status(400).json({ error: 'Invalid payment reference, account, or amount' });
            }

            // Extract user ID from payment reference (format: UFRIENDS_{phone}_{userId})
            const accountReference = product.reference;

            // Find user by account reference
            const user = await prisma.user.findFirst({
                where: { accountReference }
            });

            if (!user) {
                console.error('User not found for account reference:', accountReference);
                return res.status(404).json({ error: 'User not found' });
            }

            // Calculate fee and final amount
            // Monnify Rule: 0.5% capped at N50
            const amount = Number(amountPaid);
            const feePercentage = parseFloat(process.env.MONNIFY_FEE_PERCENTAGE || 0.5) / 100;
            const feeCap = parseFloat(process.env.MONNIFY_FEE_CAP || 50);

            let serviceCharge = amount * feePercentage;
            if (serviceCharge > feeCap) serviceCharge = feeCap;

            const finalAmount = amount - serviceCharge;

            if (finalAmount <= 0) {
                console.error(`Monnify: Amount too small after fee deduction. Amount: ${amount}, Fee: ${serviceCharge}`);
                return res.status(200).json({ message: 'Amount too small after fee' });
            }

            // Check idempotency and increment wallet atomically within transaction
            const result = await prisma.$transaction(async (tx) => {
                await walletOps.lockUser(tx, user.id);
                const existing = await tx.transaction.findFirst({
                    where: { reference: transactionReference }
                });

                if (existing) {
                    return { alreadyProcessed: true };
                }

                const updatedUser = await walletOps.credit(tx, user.id, finalAmount, { source: 'monnify_webhook', reference: transactionReference });

                await tx.transaction.create({
                    data: {
                        userId: user.id,
                        type: 'funding',
                        amount: finalAmount,
                        serviceName: 'Monnify Virtual Account',
                        description: `Wallet Funding via Monnify (Fee: ₦${serviceCharge.toFixed(2)})`,
                        status: 0,
                        reference: transactionReference,
                        oldBalance: updatedUser.wallet - finalAmount,
                        newBalance: updatedUser.wallet,
                        date: new Date(paidOn)
                    }
                });

                await recordWalletCredit(tx, {
                    user,
                    amount: finalAmount,
                    previousBalance: updatedUser.wallet - finalAmount,
                    newBalance: updatedUser.wallet,
                    type: 'MONNIFY_WEBHOOK',
                    channel: 'monnify',
                    reference: transactionReference,
                    description: `Wallet Funding via Monnify (Fee: ₦${serviceCharge.toFixed(2)})`,
                    initiatedBy: 'monnify_webhook',
                    metadata: { serviceCharge, rawAmount: amount, paidOn }
                });

                return { updatedUser };
            });

            if (result.alreadyProcessed) {
                console.log('Transaction already processed:', transactionReference);
                return res.status(200).json({ message: 'Transaction already processed' });
            }

            const newBalance = result.updatedUser.wallet;
            console.log(`Monnify: Credited ₦${finalAmount} to user ${user.id}. Fee: ₦${serviceCharge}. New balance: ₦${newBalance}`);

            // Send email notification
            sendTransactionReceipt(user, {
                status: 'success',
                amount: finalAmount.toString(),
                serviceName: 'Wallet Funding',
                description: `Wallet Funding via Monnify`,
                reference: transactionReference,
                newBalance: newBalance.toString()
            }).catch(err => console.error('Email error:', err));

            return res.status(200).json({ message: 'Webhook processed successfully' });
        }

        // Acknowledge other event types
        res.status(200).json({ message: 'Event acknowledged' });
    } catch (error) {
        console.error('Monnify webhook error:', error);
        sendAdminAlert('Monnify Webhook Failed', error.message).catch(e => console.error(e));
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * @route   POST /api/webhooks/paymentpoint
 * @desc    Handle PaymentPoint payment notifications
 * @access  Public (but verified via signature)
 */
router.post('/paymentpoint', async (req, res) => {
    try {
        const signature = req.headers['x-paymentpoint-signature'] || 
                          req.headers['paymentpoint-signature'] || 
                          req.headers['x-signature'] || 
                          req.headers['signature'];
        
        // Parse payload correctly protecting against modified spacings (prefer raw buffer or rawBody)
        const payloadStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (req.rawBody || JSON.stringify(req.body));

        // Verify webhook signature with raw string
        const isValid = await paymentpointService.verifyWebhookSignature(signature, payloadStr);
        if (!isValid) {
            console.error('[Webhook Debug] Invalid PaymentPoint webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const payloadObj = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(payloadStr);
        const event = (payloadObj.event || payloadObj.status || payloadObj.notification_status || payloadObj.transaction_status || '').toUpperCase();
        const data = payloadObj.data || payloadObj;

        // Process successful payment
        const isSuccess = ['CHARGE.SUCCESS', 'PAYMENT_SUCCESSFUL', 'PAYMENT.SUCCESSFUL', 'SUCCESS', 'COMPLETED', 'TRUE'].includes(event);

        if (isSuccess) {
            const reference = data.reference || payloadObj.reference || payloadObj.transaction_id || payloadObj.transactionReference;
            // PaymentPoint payload uses `amount_paid`
            const amount = data.amount_paid || payloadObj.amount_paid || data.amount || payloadObj.amount;
            const paidAt = data.paidAt || payloadObj.paidAt || payloadObj.created_at;
            const customerEmail = data.customerEmail || data.email || payloadObj.customer?.email || payloadObj.customerEmail;

            // Robust account number extraction from old platform concept
            const vaAccountNum = data?.accountNumber ||
                data?.destinationAccountNumber ||
                data?.beneficiaryAccountNumber ||
                data?.bankAccount?.accountNumber ||
                data?.receiver?.account_number ||
                (Array.isArray(data?.bankAccounts) && data.bankAccounts.length > 0 ? data.bankAccounts[0]?.accountNumber : null) ||
                payloadObj?.account_number;


            // Find user robustly using OR condition, preventing matching nulls
            // A payer email is not proof that this payment belongs to a Ufriends
            // wallet. Credit only the exact virtual account assigned to a user.
            const accountNumber = String(vaAccountNum || '').replace(/\D/g, '');
            const user = accountNumber.length >= 10
                ? await prisma.user.findFirst({
                    where: {
                        OR: [
                            { bankNo: accountNumber },
                            { virtualAccounts: { some: { accountNumber } } }
                        ]
                    }
                })
                : null;

            if (!user) {
                console.error(`[PaymentPoint] No user assigned to supplied virtual account; reference=${String(reference || '').slice(0, 80)}`);
                // Return 200 ok to stop retry loops
                return res.status(200).json({ ok: true, message: 'Unmatched user processed silently' });
            }


            // Update user wallet with fee deduction
            // PaymentPoint Rule: 0.5% capped at N100
            const amountInNaira = Number(amount);
            if (!reference || !Number.isFinite(amountInNaira) || amountInNaira <= 0) {
                return res.status(400).json({ error: 'Invalid payment reference or amount' });
            }
            const feePercentage = parseFloat(process.env.PAYMENTPOINT_FEE_PERCENTAGE || 0.5) / 100;
            const feeCap = parseFloat(process.env.PAYMENTPOINT_FEE_CAP || 100);

            let serviceCharge = amountInNaira * feePercentage;
            if (serviceCharge > feeCap) serviceCharge = feeCap;

            const finalAmount = amountInNaira - serviceCharge;

            if (finalAmount <= 0) {
                console.error(`[Webhook Debug] PaymentPoint: Amount too small after fee deduction. Amount: ${amountInNaira}, Fee: ${serviceCharge}`);
                return res.status(200).json({ ok: true, message: 'Amount too small after fee' });
            }

            // Check idempotency and increment wallet atomically within transaction
            const result = await prisma.$transaction(async (tx) => {
                await walletOps.lockUser(tx, user.id);
                const existing = await tx.transaction.findFirst({
                    where: { reference }
                });

                if (existing) {
                    return { alreadyProcessed: true };
                }

                const updatedUser = await walletOps.credit(tx, user.id, finalAmount, { source: 'paymentpoint_webhook', reference });

                await tx.transaction.create({
                    data: {
                        userId: user.id,
                        type: 'funding',
                        amount: finalAmount,
                        serviceName: 'PaymentPoint Virtual Account',
                        description: `Wallet Funding via PaymentPoint (Fee: ₦${serviceCharge.toFixed(2)})`,
                        status: 0,
                        reference: reference, // using reference from payload
                        oldBalance: updatedUser.wallet - finalAmount,
                        newBalance: updatedUser.wallet,
                        date: paidAt ? new Date(paidAt) : new Date()
                    }
                });

                await recordWalletCredit(tx, {
                    user,
                    amount: finalAmount,
                    previousBalance: updatedUser.wallet - finalAmount,
                    newBalance: updatedUser.wallet,
                    type: 'PAYMENTPOINT_WEBHOOK',
                    channel: 'paymentpoint',
                    reference: reference,
                    description: `Wallet Funding via PaymentPoint (Fee: ₦${serviceCharge.toFixed(2)})`,
                    initiatedBy: 'paymentpoint_webhook',
                    metadata: { serviceCharge, rawAmount: amountInNaira, paidAt, customerEmail }
                });

                return { updatedUser };
            });

            if (result.alreadyProcessed) {
                console.log('[PaymentPoint] Transaction already processed:', reference);
                return res.status(200).json({ ok: true, message: 'Transaction already processed' });
            }

            const newBalance = result.updatedUser.wallet;
            console.log(`[Webhook Debug] PaymentPoint: Credited ₦${finalAmount} to user ${user.id}. Fee: ₦${serviceCharge}. New balance: ₦${newBalance}`);

            // Send email notification
            sendTransactionReceipt(user, {
                status: 'success',
                amount: finalAmount.toString(),
                serviceName: 'Wallet Funding',
                description: `Wallet Funding via PaymentPoint`,
                reference: reference,
                newBalance: newBalance.toString()
            }).catch(err => console.error('Email error:', err));

            return res.status(200).json({ ok: true, message: 'Webhook processed successfully' });
        }

        // Acknowledge other event types
        res.status(200).json({ ok: true, message: 'Event acknowledged' });
    } catch (error) {
        console.error('[PaymentPoint] Webhook processing error:', error.message);
        sendAdminAlert('PaymentPoint Webhook Failed', error.message).catch(e => console.error(e));
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * @route   POST /api/webhooks/paystack
 * @desc    Handle Paystack payment notifications
 */
router.post('/paystack', async (req, res) => {
    try {
        let secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            const gw = await prisma.paymentGateway.findUnique({ where: { provider: 'PAYSTACK' } });
            secret = gw?.apiKey?.startsWith('sk_') ? gw.apiKey : (gw?.secretKey || gw?.apiKey);
        }
        if (!secret) {
            console.error('Paystack secret key not configured');
            return res.status(500).send('Paystack not configured');
        }

        const payloadStr = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (req.rawBody || JSON.stringify(req.body));
        const hash = crypto.createHmac('sha512', secret).update(payloadStr).digest('hex');
        
        if (hash !== req.headers['x-paystack-signature']) {
            return res.status(401).send('Invalid signature');
        }

        const event = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(payloadStr);
        if (event.event === 'charge.success') {
            const { reference, metadata } = event.data;

            if (metadata?.type === 'reseller_setup') {
                const request = await prisma.resellerRequest.update({
                    where: { paymentRef: reference },
                    data: {
                        status: 'processing',
                        paymentStatus: 'paid'
                    }
                });
                
                console.log(`Reseller request ${reference} marked as processing.`);

                // ─── Automated Notifications ─────────────────────────────────
                const { sendResellerConfirmation, sendResellerAdminAlert } = require('../services/email.service');
                
                // 1. Notify User with Tracking ID
                sendResellerConfirmation(request.contactEmail, request.paymentRef)
                    .catch(e => console.error('Reseller confirmation email failed:', e));

                // 2. Alert Admin
                sendResellerAdminAlert(request)
                    .catch(e => console.error('Reseller admin alert failed:', e));
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Paystack webhook error:', error);
        res.status(500).send('Webhook failed');
    }
});

module.exports = router;
