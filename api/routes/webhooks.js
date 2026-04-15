const express = require('express');
const router = express.Router();
const { z } = require('zod');
const crypto = require('crypto');
const { sendTransactionReceipt, sendAdminAlert } = require('../services/email.service');
const prisma = require('../../prisma/client');
const monnifyService = require('../services/monnify.service');
const paymentpointService = require('../services/paymentpoint.service');

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
        const payloadStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody);

        // Verify webhook signature with raw string
        const isValid = monnifyService.verifyWebhookSignature(signature, payloadStr);
        if (!isValid) {
            console.error('Invalid Monnify webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const payloadObj = JSON.parse(payloadStr);
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
            const amount = parseFloat(amountPaid);
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
                const existing = await tx.transaction.findFirst({
                    where: { reference: transactionReference }
                });

                if (existing) {
                    return { alreadyProcessed: true };
                }

                const updatedUser = await tx.user.update({
                    where: { id: user.id },
                    data: { wallet: { increment: finalAmount } }
                });

                await tx.transaction.create({
                    data: {
                        userId: user.id,
                        type: 'funding',
                        amount: finalAmount,
                        serviceName: 'Monnify Virtual Account',
                        description: `Wallet Funding via Monnify (Fee: ₦${serviceCharge.toFixed(2)})`,
                        status: 0,
                        reference: transactionReference,
                        oldBalance: user.wallet,
                        newBalance: updatedUser.wallet,
                        date: new Date(paidOn)
                    }
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
        const signature = req.headers['paymentpoint-signature'] || req.headers['x-paymentpoint-signature'];
        
        // Parse payload correctly protecting against express.raw buffers
        const rawBody = req.body;
        const payloadStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody);

        // Verify webhook signature with raw string
        const isValid = await paymentpointService.verifyWebhookSignature(signature, payloadStr);
        if (!isValid) {
            console.error('Invalid PaymentPoint webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const payloadObj = JSON.parse(payloadStr);
        const { event, data } = payloadObj;

        // Process successful payment
        if (event === 'charge.success' || event === 'payment.successful') {
            const {
                reference,
                amount,
                paidAt,
                customerEmail
            } = data;

            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email: customerEmail }
            });

            if (!user) {
                console.error('User not found for email:', customerEmail);
                return res.status(404).json({ error: 'User not found' });
            }

            // Update user wallet with fee deduction
            // PaymentPoint Rule: 1.6% capped at N2000
            const amountInNaira = parseFloat(amount);
            const feePercentage = parseFloat(process.env.PAYMENTPOINT_FEE_PERCENTAGE || 1.6) / 100;
            const feeCap = parseFloat(process.env.PAYMENTPOINT_FEE_CAP || 2000);

            let serviceCharge = amountInNaira * feePercentage;
            if (serviceCharge > feeCap) serviceCharge = feeCap;

            const finalAmount = amountInNaira - serviceCharge;

            if (finalAmount <= 0) {
                console.error(`PaymentPoint: Amount too small after fee deduction. Amount: ${amountInNaira}, Fee: ${serviceCharge}`);
                return res.status(200).json({ message: 'Amount too small after fee' });
            }

            // Check idempotency and increment wallet atomically within transaction
            const result = await prisma.$transaction(async (tx) => {
                const existing = await tx.transaction.findFirst({
                    where: { reference }
                });

                if (existing) {
                    return { alreadyProcessed: true };
                }

                const updatedUser = await tx.user.update({
                    where: { id: user.id },
                    data: { wallet: { increment: finalAmount } }
                });

                await tx.transaction.create({
                    data: {
                        userId: user.id,
                        type: 'funding',
                        amount: finalAmount,
                        serviceName: 'PaymentPoint Virtual Account',
                        description: `Wallet Funding via PaymentPoint (Fee: ₦${serviceCharge.toFixed(2)})`,
                        status: 0,
                        reference,
                        oldBalance: user.wallet,
                        newBalance: updatedUser.wallet,
                        date: paidAt ? new Date(paidAt) : new Date()
                    }
                });

                return { updatedUser };
            });

            if (result.alreadyProcessed) {
                console.log('Transaction already processed:', reference);
                return res.status(200).json({ message: 'Transaction already processed' });
            }

            const newBalance = result.updatedUser.wallet;
            console.log(`PaymentPoint: Credited ₦${finalAmount} to user ${user.id}. Fee: ₦${serviceCharge}. New balance: ₦${newBalance}`);

            // Send email notification
            sendTransactionReceipt(user, {
                status: 'success',
                amount: finalAmount.toString(),
                serviceName: 'Wallet Funding',
                description: `Wallet Funding via PaymentPoint`,
                reference: reference, // using reference from payload
                newBalance: newBalance.toString()
            }).catch(err => console.error('Email error:', err));

            return res.status(200).json({ message: 'Webhook processed successfully' });
        }

        // Acknowledge other event types
        res.status(200).json({ message: 'Event acknowledged' });
    } catch (error) {
        console.error('PaymentPoint webhook error:', error);
        sendAdminAlert('PaymentPoint Webhook Failed', error.message).catch(e => console.error(e));
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
