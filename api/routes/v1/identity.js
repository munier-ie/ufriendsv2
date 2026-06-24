/**
 * /api/v1/identity
 * External API – NIN Slip & BVN Slip
 *
 * Auth:   API Key (Bearer <apiKey>) via apiKeyAuth middleware
 * Access: Vendor accounts only (enforced by apiKeyAuth)
 *
 * Key differences from the internal /api/professional/request:
 *  - No transaction PIN required (API key is the authorisation)
 *  - Slim, clean request/response shape for programmatic integration
 *  - Webhook fired on success & failure
 */

const express  = require('express');
const router   = express.Router();
const prisma   = require('../../../prisma/client');
const crypto   = require('crypto');
const { z }    = require('zod');
const { apiKeyAuth, logApiResponse } = require('../../middleware/apiKeySecurity');
const bvnService = require('../../services/bvn.service');
const ninService = require('../../services/nin.service');
const { creditReferralBonus }     = require('../../services/referral.service');
const { sendWebhookNotification } = require('../webhookVendor');

router.use(logApiResponse);

// ─── Validation Schemas ──────────────────────────────────────────────────────

const bvnSchema = z.object({
    bvn:      z.string().length(11, 'BVN must be exactly 11 digits').regex(/^\d+$/, 'BVN must be numeric'),
    slipType: z.enum(['regular']).default('regular') // Only one BVN slip type for now
});

const ninSchema = z.object({
    // Lookup by NIN number OR phone number
    nin:          z.string().length(11).regex(/^\d+$/, 'NIN must be 11 numeric digits').optional(),
    phone:        z.string().min(10).max(14).optional(),
    lookupMethod: z.enum(['nin', 'phone']).default('nin'),
    slipType:     z.enum(['regular', 'standard', 'premium']).default('regular')
}).refine(data => data.nin || data.phone, {
    message: 'Either nin or phone is required'
});

// ─── GET /api/v1/identity/pricing ────────────────────────────────────────────
/**
 * @api {get} /api/v1/identity/pricing Get NIN & BVN Pricing
 * Returns current prices for the authenticated vendor tier.
 */
router.get('/pricing', apiKeyAuth, async (req, res) => {
    try {
        const userType = req.user.type; // Always 3 (vendor) at this point

        // BVN pricing
        const bvnPricing = await bvnService.getBvnPricing(userType, 'regular').catch(() => null);

        // NIN pricing (all slip types)
        const [ninRegular, ninStandard, ninPremium] = await Promise.all([
            ninService.getNinPricing('regular',  userType).catch(() => null),
            ninService.getNinPricing('standard', userType).catch(() => null),
            ninService.getNinPricing('premium',  userType).catch(() => null)
        ]);

        res.json({
            success: true,
            pricing: {
                bvn: bvnPricing ? {
                    slipType:  'regular',
                    price:     bvnPricing.userPrice,
                    available: bvnPricing.settings?.active ?? false
                } : null,
                nin: {
                    regular:  ninRegular  ? { price: ninRegular.userPrice,  available: ninRegular.settings?.ninActive  ?? false } : null,
                    standard: ninStandard ? { price: ninStandard.userPrice, available: ninStandard.settings?.ninActive ?? false } : null,
                    premium:  ninPremium  ? { price: ninPremium.userPrice,  available: ninPremium.settings?.ninActive  ?? false } : null
                }
            }
        });
    } catch (error) {
        console.error('[v1/identity pricing] Error:', error);
        res.status(500).json({ status: 1, message: 'Failed to fetch pricing' });
    }
});

// ─── POST /api/v1/identity/bvn ───────────────────────────────────────────────
/**
 * @api {post} /api/v1/identity/bvn Run BVN Verification & Generate Slip
 * @apiHeader  {String} Authorization  Bearer <apiKey>
 * @apiBody    {String} bvn            11-digit BVN
 * @apiBody    {String} [slipType]     "regular" (default)
 *
 * @apiSuccess {Boolean} success
 * @apiSuccess {String}  reference     Transaction reference
 * @apiSuccess {Object}  report        BVN report data including pdfUrl
 * @apiSuccess {Number}  newBalance    Wallet balance after deduction
 */
router.post('/bvn', apiKeyAuth, async (req, res) => {
    try {
        // 1. Validate input
        const validation = bvnSchema.safeParse(req.body);
        if (!validation.success) {
            const msg = validation.error.errors[0]?.message || 'Invalid request';
            return res.status(400).json({ status: 1, message: msg });
        }

        const { bvn, slipType } = validation.data;

        // Sandbox / Test Mode Interception
        if (req.query.test === 'true') {
            const dummyReference = `TEST-BVN-${crypto.randomUUID()}`;
            sendWebhookNotification(req.user.id, 'identity.bvn.success', {
                reference: dummyReference,
                slipType,
                pdfUrl: 'https://ufriends.com.ng/api/reports/sandbox/sample-bvn.pdf',
                newBalance: req.user.wallet,
                isTest: true
            }).catch(() => {});

            return res.json({
                success: true,
                reference: dummyReference,
                newBalance: req.user.wallet,
                report: {
                    firstName: "JOHN",
                    lastName: "DOE",
                    bvn: bvn,
                    pdfUrl: 'https://ufriends.com.ng/api/reports/sandbox/sample-bvn.pdf'
                },
                message: "Sandbox transaction successful. No funds were deducted."
            });
        }

        // 2. Get pricing & check availability
        const pricing = await bvnService.getBvnPricing(req.user.type, slipType);

        if (!pricing.settings?.active) {
            return res.status(503).json({ status: 1, message: 'BVN verification service is currently unavailable' });
        }

        const { userPrice: amount, apiPrice: cost } = pricing;
        const profit = amount - (cost || 0);

        // 3. Balance check
        const freshUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { wallet: true } });
        if (freshUser.wallet < amount) {
            return res.status(400).json({
                status:  1,
                message: `Insufficient wallet balance. Required: ₦${amount.toFixed(2)}, Available: ₦${freshUser.wallet.toFixed(2)}`
            });
        }

        // 4. Atomic debit + records
        const transactionRef = `BVN-API-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        const dbResult = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: req.user.id },
                data:  { wallet: { decrement: amount } }
            });

            const serviceReq = await tx.serviceRequest.create({
                data: {
                    reference: transactionRef,
                    type:      'BVN_SLIP_SERVICE',
                    details:   JSON.stringify({ bvnNumber: bvn, slipType }),
                    amount,
                    status:    0,
                    userId:    req.user.id,
                    updatedAt: new Date()
                }
            });

            await tx.transaction.create({
                data: {
                    reference:   transactionRef,
                    serviceName: 'BVN Verification Slip',
                    description: `[API] BVN Slip (${slipType}) lookup`,
                    amount:      -amount,
                    status:      0,
                    oldBalance:  freshUser.wallet,
                    newBalance:  freshUser.wallet - amount,
                    profit:      profit > 0 ? profit : 0,
                    userId:      req.user.id,
                    type:        'professional'
                }
            });

            return { serviceReq, newBalance: updatedUser.wallet };
        });

        // 5. Run BVN verification
        const verificationResult = await bvnService.processBvnVerification(
            req.user.id, bvn, transactionRef, req.user.type, slipType
        );

        if (verificationResult.success) {
            // Update service request to success
            await prisma.serviceRequest.update({
                where: { id: dbResult.serviceReq.id },
                data:  {
                    status:  1,
                    details: JSON.stringify({ bvnNumber: bvn, slipType, pdfUrl: verificationResult.report?.pdfUrl })
                }
            });

            // Referral bonus
            creditReferralBonus(req.user.id, 'bvn', pricing.settings.referralCommission || 0)
                .catch(err => console.error('[v1/bvn] Referral bonus error:', err));

            // Webhook
            sendWebhookNotification(req.user.id, 'identity.bvn.success', {
                reference:  transactionRef,
                slipType,
                pdfUrl:     verificationResult.report?.pdfUrl,
                newBalance: dbResult.newBalance
            }).catch(() => {});

            return res.json({
                success:    true,
                reference:  transactionRef,
                newBalance: dbResult.newBalance,
                report:     verificationResult.report
            });

        } else {
            // Refund on failure
            await Promise.all([
                prisma.serviceRequest.update({
                    where: { id: dbResult.serviceReq.id },
                    data:  { status: 2, details: JSON.stringify({ bvnNumber: bvn, slipType, error: verificationResult.message }) }
                }),
                prisma.user.update({
                    where: { id: req.user.id },
                    data:  { wallet: { increment: amount } }
                }),
                prisma.transaction.updateMany({
                    where: { reference: transactionRef, userId: req.user.id },
                    data:  { status: 2 }
                })
            ]);

            sendWebhookNotification(req.user.id, 'identity.bvn.failed', {
                reference: transactionRef,
                reason:    verificationResult.message
            }).catch(() => {});

            return res.status(400).json({
                status:     1,
                message:    verificationResult.message || 'BVN verification failed',
                reference:  transactionRef,
                newBalance: freshUser.wallet  // refunded — back to original
            });
        }

    } catch (error) {
        console.error('[v1/identity/bvn] Error:', error);
        res.status(500).json({ status: 1, message: 'BVN verification failed. Please try again.' });
    }
});

// ─── POST /api/v1/identity/nin ───────────────────────────────────────────────
/**
 * @api {post} /api/v1/identity/nin Run NIN Verification & Generate Slip
 * @apiHeader  {String} Authorization   Bearer <apiKey>
 * @apiBody    {String} [nin]           11-digit NIN (use when lookupMethod = "nin")
 * @apiBody    {String} [phone]         Phone number  (use when lookupMethod = "phone")
 * @apiBody    {String} [lookupMethod]  "nin" (default) | "phone"
 * @apiBody    {String} [slipType]      "regular" (default) | "standard" | "premium"
 *
 * @apiSuccess {Boolean} success
 * @apiSuccess {String}  reference     Transaction reference
 * @apiSuccess {Object}  report        NIN report data including pdfUrl
 * @apiSuccess {Number}  newBalance    Wallet balance after deduction
 */
router.post('/nin', apiKeyAuth, async (req, res) => {
    try {
        // 1. Validate input
        const validation = ninSchema.safeParse(req.body);
        if (!validation.success) {
            const msg = validation.error.errors[0]?.message || 'Invalid request';
            return res.status(400).json({ status: 1, message: msg });
        }

        const { nin, phone, lookupMethod, slipType } = validation.data;

        const lookupNumber = lookupMethod === 'phone' ? phone : nin;
        if (!lookupNumber) {
            const field = lookupMethod === 'phone' ? 'phone' : 'nin';
            return res.status(400).json({ status: 1, message: `${field} is required for lookupMethod="${lookupMethod}"` });
        }

        // Sandbox / Test Mode Interception
        if (req.query.test === 'true') {
            const dummyReference = `TEST-NIN-${crypto.randomUUID()}`;
            sendWebhookNotification(req.user.id, 'identity.nin.success', {
                reference: dummyReference,
                slipType,
                lookupMethod,
                pdfUrl: 'https://ufriends.com.ng/api/reports/sandbox/sample-nin.pdf',
                newBalance: req.user.wallet,
                isTest: true
            }).catch(() => {});

            return res.json({
                success: true,
                reference: dummyReference,
                newBalance: req.user.wallet,
                report: {
                    firstName: "JANE",
                    lastName: "DOE",
                    nin: nin || "12345678901",
                    pdfUrl: 'https://ufriends.com.ng/api/reports/sandbox/sample-nin.pdf'
                },
                message: "Sandbox transaction successful. No funds were deducted."
            });
        }

        // 2. Get pricing & check availability
        const pricing = await ninService.getNinPricing(slipType, req.user.type);

        if (!pricing.settings?.ninActive) {
            return res.status(503).json({ status: 1, message: 'NIN verification service is currently unavailable' });
        }

        const { userPrice: amount, apiPrice: cost } = pricing;
        const profit = amount - (cost || 0);

        // 3. Balance check
        const freshUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { wallet: true } });
        if (freshUser.wallet < amount) {
            return res.status(400).json({
                status:  1,
                message: `Insufficient wallet balance. Required: ₦${amount.toFixed(2)}, Available: ₦${freshUser.wallet.toFixed(2)}`
            });
        }

        // 4. Atomic debit + records
        const transactionRef = `NIN-API-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        const dbResult = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: req.user.id },
                data:  { wallet: { decrement: amount } }
            });

            const serviceReq = await tx.serviceRequest.create({
                data: {
                    reference: transactionRef,
                    type:      'NIN_SLIP_SERVICE',
                    details:   JSON.stringify({ nin, phone, lookupMethod, slipType }),
                    amount,
                    status:    0,
                    userId:    req.user.id,
                    updatedAt: new Date()
                }
            });

            await tx.transaction.create({
                data: {
                    reference:   transactionRef,
                    serviceName: `NIN Slip (${slipType})`,
                    description: `[API] NIN Slip (${slipType}) lookup via ${lookupMethod}`,
                    amount:      -amount,
                    status:      0,
                    oldBalance:  freshUser.wallet,
                    newBalance:  freshUser.wallet - amount,
                    profit:      profit > 0 ? profit : 0,
                    userId:      req.user.id,
                    type:        'professional'
                }
            });

            return { serviceReq, newBalance: updatedUser.wallet };
        });

        // 5. Run NIN verification
        const verificationResult = await ninService.processNinVerification(
            req.user.id, lookupNumber, slipType, transactionRef, req.user.type, lookupMethod
        );

        if (verificationResult.success) {
            await prisma.serviceRequest.update({
                where: { id: dbResult.serviceReq.id },
                data:  {
                    status:  1,
                    details: JSON.stringify({ nin, phone, lookupMethod, slipType, pdfUrl: verificationResult.report?.pdfUrl })
                }
            });

            // Referral bonus
            creditReferralBonus(req.user.id, 'nin', pricing.settings.referralCommission || 0)
                .catch(err => console.error('[v1/nin] Referral bonus error:', err));

            // Webhook
            sendWebhookNotification(req.user.id, 'identity.nin.success', {
                reference:    transactionRef,
                slipType,
                lookupMethod,
                pdfUrl:       verificationResult.report?.pdfUrl,
                newBalance:   dbResult.newBalance
            }).catch(() => {});

            return res.json({
                success:    true,
                reference:  transactionRef,
                newBalance: dbResult.newBalance,
                report:     verificationResult.report
            });

        } else {
            // Refund on failure
            await Promise.all([
                prisma.serviceRequest.update({
                    where: { id: dbResult.serviceReq.id },
                    data:  { status: 2, details: JSON.stringify({ nin, phone, lookupMethod, slipType, error: verificationResult.message }) }
                }),
                prisma.user.update({
                    where: { id: req.user.id },
                    data:  { wallet: { increment: amount } }
                }),
                prisma.transaction.updateMany({
                    where: { reference: transactionRef, userId: req.user.id },
                    data:  { status: 2 }
                })
            ]);

            sendWebhookNotification(req.user.id, 'identity.nin.failed', {
                reference: transactionRef,
                reason:    verificationResult.message
            }).catch(() => {});

            return res.status(400).json({
                status:     1,
                message:    verificationResult.message || 'NIN verification failed',
                reference:  transactionRef,
                newBalance: freshUser.wallet  // refunded
            });
        }

    } catch (error) {
        console.error('[v1/identity/nin] Error:', error);
        res.status(500).json({ status: 1, message: 'NIN verification failed. Please try again.' });
    }
});

module.exports = router;
