/**
 * /api/v1/services
 * External API – Services
 *
 * Auth: API Key (Bearer <apiKey>) via apiKeyAuth middleware
 * No transaction PIN required; the API key itself is the authorisation.
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../../prisma/client');
const { z } = require('zod');
const crypto = require('crypto');
const { apiKeyAuth, logApiResponse } = require('../../middleware/apiKeySecurity');
const { creditReferralBonus } = require('../../services/referral.service');
const { sendTransactionReceipt } = require('../../services/email.service');
const { cache } = require('../../middleware/cacheMiddleware');
const { sendWebhookNotification } = require('../webhookVendor');

// ─── Apply logging to every response ────────────────────────────────────────
router.use(logApiResponse);

// ─── Validation Schemas ──────────────────────────────────────────────────────
const purchaseSchema = z.object({
    serviceId:   z.number({ required_error: 'serviceId is required' }),
    recipient:   z.string().trim().min(5, 'recipient must be at least 5 characters'),
    amount:      z.number().positive('amount must be positive'),
    networkType: z.string().optional(),              // VTU | Share | Momo (airtime)
    iucNumber:   z.string().optional(),              // Cable TV
    meterNumber: z.string().optional(),              // Electricity
    meterType:   z.enum(['prepaid', 'postpaid']).optional(),
    quantity:    z.number().int().positive().optional(), // Exam / Data Pin
    metadata:    z.record(z.any()).optional()
}).passthrough();

const verifySchema = z.object({
    type:      z.enum(['cable', 'electricity']),
    provider:  z.string(),
    number:    z.string().min(5),
    meterType: z.enum(['prepaid', 'postpaid']).optional()
});

// ─── GET /api/v1/services/:type ──────────────────────────────────────────────
/**
 * @api {get} /api/v1/services/:type List Service Plans
 * @apiParam {String} type  airtime | data | cable | electricity | exam
 * @apiHeader {String} Authorization Bearer <apiKey>
 */
router.get('/:type', apiKeyAuth, cache(300), async (req, res) => {
    try {
        const { type } = req.params;
        const userType = req.user.type; // 1=Regular, 2=Agent, 3=Vendor

        if (type === 'exam') {
            const examServices = await prisma.service.findMany({
                where: { type: 'exam', active: true },
                orderBy: [{ provider: 'asc' }, { code: 'asc' }]
            });

            const QTY_MAP = {
                'NEONE': 1, 'NETWO': 2, 'NETHR': 3, 'NEFOUR': 4, 'NEFIVE': 5,
                'WAONE': 1, 'WATWO': 2, 'WATHR': 3, 'WAFOUR': 4, 'WAFIVE': 5
            };

            const services = examServices.map(s => {
                let price = s.price;
                if (userType === 2 && s.agentPrice)  price = s.agentPrice;
                if (userType === 3 && s.vendorPrice) price = s.vendorPrice;

                const qty = QTY_MAP[s.code] || 1;
                const examBoard = s.provider || 'EXAM';

                return {
                    id:       s.id,
                    name:     `${examBoard} – ${qty} Token${qty > 1 ? 's' : ''}`,
                    type:     'exam',
                    provider: s.provider,
                    code:     s.code,
                    quantity: qty,
                    price,
                    active:   s.active
                };
            });

            return res.json({ success: true, services });
        }

        // Resolve active provider + routing overrides
        const [activeProvider, routingOverrides] = await Promise.all([
            prisma.activeProvider.findUnique({ where: { serviceType: type } }),
            prisma.providerRouting.findMany({ where: { serviceType: type, active: true } })
        ]);

        const activeProviderId = activeProvider?.apiProviderId || null;

        let allServices = await prisma.service.findMany({
            where: { type, active: true },
            orderBy: { name: 'asc' }
        });

        // Data plan metadata (for data type)
        let dataPlansMap = {};
        if (type === 'data') {
            const dataPlans = await prisma.dataPlan.findMany();
            dataPlans.forEach(dp => {
                dataPlansMap[dp.planId] = { network: dp.network, dataType: dp.dataType };
            });
        }

        const extractNetworkInfo = (service) => {
            if (type === 'data') {
                const dp = dataPlansMap[service.code];
                if (dp) return { network: dp.network, networkType: dp.dataType };
            } else if (type === 'airtime') {
                return { network: service.provider, networkType: 'VTU' };
            }
            return { network: service.provider, networkType: null };
        };

        const filteredServices = allServices.filter(service => {
            if (service.apiProviderId === null) return true;
            const { network, networkType } = extractNetworkInfo(service);
            const override = routingOverrides.find(r =>
                r.network.toUpperCase() === (network || '').toUpperCase() &&
                r.networkType.toUpperCase() === (networkType || '').toUpperCase()
            );
            return override
                ? service.apiProviderId === override.apiProviderId
                : service.apiProviderId === activeProviderId;
        });

        const services = filteredServices.map(s => {
            let price = s.price;
            if (userType === 2 && s.agentPrice)  price = s.agentPrice;
            if (userType === 3 && s.vendorPrice) price = s.vendorPrice;
            return { ...s, price };
        });

        res.json({ success: true, services });
    } catch (error) {
        console.error('[v1/services GET] Error:', error);
        res.status(500).json({ status: 1, message: 'Failed to fetch services' });
    }
});

// ─── POST /api/v1/services/verify ───────────────────────────────────────────
/**
 * @api {post} /api/v1/services/verify Verify Cable IUC or Electricity Meter
 * @apiBody {String} type      cable | electricity
 * @apiBody {String} provider  e.g. "dstv", "eko"
 * @apiBody {String} number    IUC or meter number
 */
router.post('/verify', apiKeyAuth, async (req, res) => {
    try {
        const validation = verifySchema.safeParse(req.body);
        if (!validation.success) {
            const msg = validation.error.issues?.[0]?.message || 'Invalid request';
            return res.status(400).json({ status: 1, message: msg });
        }

        const { type, provider, number, meterType } = validation.data;
        
        // Sandbox / Test Mode Interception
        if (req.query.test === 'true') {
            return res.json({
                success: true,
                valid: true,
                customerName: "TEST CUSTOMER (SANDBOX)",
                address: "123 Sandbox Lane",
                message: "Sandbox verification successful."
            });
        }

        const { verifyUtility } = require('../../services/verify.service');
        const result = await verifyUtility(type, provider, number, meterType);

        if (result.valid) {
            return res.json({ success: true, ...result });
        }
        res.status(400).json({ status: 1, message: result.message || 'Verification failed' });
    } catch (error) {
        console.error('[v1/services verify] Error:', error);
        res.status(500).json({ status: 1, message: 'Verification failed' });
    }
});

// ─── POST /api/v1/services/purchase ─────────────────────────────────────────
/**
 * @api {post} /api/v1/services/purchase Purchase a Service
 * @apiHeader  {String} Authorization Bearer <apiKey>
 * @apiBody    {Number} serviceId
 * @apiBody    {String} recipient   Phone number or account number
 * @apiBody    {Number} amount      For airtime/electricity; ignored for fixed-price services
 * @apiBody    {String} [networkType]   VTU | Share | Momo (airtime only)
 * @apiBody    {String} [iucNumber]     Required for cable TV
 * @apiBody    {String} [meterNumber]   Required for electricity
 * @apiBody    {String} [meterType]     prepaid | postpaid (electricity)
 * @apiBody    {Number} [quantity]      Exam pins / data pins
 *
 * @note No transaction PIN required for API-key-authenticated requests.
 */
router.post('/purchase', apiKeyAuth, async (req, res) => {
    try {
        const validation = purchaseSchema.safeParse(req.body);
        if (!validation.success) {
            const msg = validation.error.issues?.[0]?.message || 'Invalid request data';
            return res.status(400).json({ status: 1, message: msg });
        }

        const { serviceId, recipient, amount, networkType } = validation.data;

        // 1. Load service
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service || !service.active) {
            return res.status(404).json({ status: 1, message: 'Service not found or unavailable' });
        }

        // Sandbox / Test Mode Interception
        if (req.query.test === 'true') {
            const dummyReference = `TEST-TXN-${crypto.randomUUID()}`;
            const dummyAmount = amount || service.price || 100;
            
            // Fire simulated webhook async
            sendWebhookNotification(req.user.id, 'transaction.success', {
                reference: dummyReference,
                serviceName: service.name,
                amount: dummyAmount,
                recipient,
                newBalance: req.user.wallet,
                status: 1,
                isTest: true
            }).catch(() => {});

            return res.json({
                success: true,
                reference: dummyReference,
                serviceName: service.name,
                amount: dummyAmount,
                newBalance: req.user.wallet, // wallet unchanged in test mode
                status: "success",
                message: "Sandbox transaction successful. No funds were deducted.",
                token: service.type === 'electricity' ? '1234-5678-9012-3456-7890' : undefined,
                pin: service.type === 'exam' ? 'TEST-PIN-9999' : undefined
            });
        }

        // 2. Type-specific field validation
        if (service.type === 'cable' && !req.body.iucNumber) {
            return res.status(400).json({ status: 1, message: 'iucNumber is required for Cable TV' });
        }
        if (service.type === 'electricity' && !req.body.meterNumber) {
            return res.status(400).json({ status: 1, message: 'meterNumber is required for Electricity' });
        }

        // 3. Determine price by account tier
        const userType = req.user.type;
        let userPrice = service.price;
        if (userType === 2 && service.agentPrice)  userPrice = service.agentPrice;
        if (userType === 3 && service.vendorPrice) userPrice = service.vendorPrice;

        // 4. Calculate final charge
        let finalAmount;
        if (service.type === 'airtime') {
            const settingsService = require('../../services/settings.service');
            const globalDiscounts = await settingsService.getSetting('airtimeDiscount', {});
            const network = service.provider.toLowerCase();
            const globalDiscount = globalDiscounts[network];
            finalAmount = globalDiscount !== undefined
                ? amount * ((100 - globalDiscount) / 100)
                : amount * (userPrice / 100);
        } else if (service.type === 'electricity') {
            finalAmount = amount + userPrice;
        } else {
            const qty = validation.data.quantity || 1;
            finalAmount = userPrice * qty;
        }

        // 5. Balance check
        if (req.user.wallet < finalAmount) {
            return res.status(400).json({
                status: 1,
                message: `Insufficient wallet balance. Required: ₦${finalAmount.toFixed(2)}, Available: ₦${req.user.wallet.toFixed(2)}`
            });
        }

        // 6. Calculate profit
        let profit = 0;
        if (service.type === 'airtime') {
            const apiCostPct = service.apiPrice || userPrice;
            profit = finalAmount - amount * (apiCostPct / 100);
        } else if (service.type === 'electricity') {
            profit = userPrice - (service.apiPrice || 0);
        } else {
            const qty = validation.data.quantity || 1;
            profit = service.apiPrice ? (finalAmount - service.apiPrice * qty) : 0;
        }

        // 7. Atomic debit + create transaction record
        const result = await prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: req.user.id },
                data: { wallet: { decrement: finalAmount } }
            });

            const transaction = await tx.transaction.create({
                data: {
                    reference:   crypto.randomUUID(),
                    serviceName: service.name,
                    description: `[API] ${service.name} for ${recipient}`,
                    amount:      -finalAmount,
                    status:      0,   // 0 = Pending/Processing
                    oldBalance:  req.user.wallet,
                    newBalance:  req.user.wallet - finalAmount,
                    profit,
                    userId:      req.user.id
                }
            });

            return { transaction, updatedUser };
        });

        // 8. Call vend service
        const { vendAirtime, vendData, vendCable, vendElectricity, vendExam } = require('../../services/vend.service');

        let vendResult;
        switch (service.type) {
            case 'airtime':
                vendResult = await vendAirtime(
                    { ...result.transaction, faceValue: amount },
                    service,
                    recipient,
                    service.provider,
                    req.body.networkType || 'VTU'
                );
                break;
            case 'data':
                vendResult = await vendData(result.transaction, service, recipient, service.provider);
                break;
            case 'cable':
                vendResult = await vendCable(
                    result.transaction,
                    service,
                    req.body.iucNumber,
                    recipient,
                    req.body.subscriptionType,
                    req.body.accessToken
                );
                break;
            case 'electricity':
                vendResult = await vendElectricity(
                    result.transaction,
                    service,
                    req.body.meterNumber,
                    recipient,
                    amount,
                    req.body.meterType || 'prepaid',
                    req.body.accessToken
                );
                break;
            case 'exam':
                vendResult = await vendExam(result.transaction, service, validation.data.quantity || 1, recipient);
                break;
            default:
                vendResult = { status: 'success', message: 'Purchase processed' };
        }

        if (vendResult.status === 'success' || vendResult.status === 'pending') {
            const responsePayload = {
                success:         true,
                reference:       result.transaction.reference,
                serviceName:     service.name,
                amount:          finalAmount,
                newBalance:      result.updatedUser.wallet,
                status:          vendResult.status,
                providerData:    vendResult.data || null
            };

            // Include token / PIN in response if present
            if (vendResult.token) responsePayload.token = vendResult.token;
            if (vendResult.pin)   responsePayload.pin   = vendResult.pin;

            res.json(responsePayload);

            // Post-processing (non-blocking)
            creditReferralBonus(req.user.id, service.type, service.referralCommission || undefined)
                .catch(err => console.error('[v1 purchase] Referral bonus error:', err));
            sendTransactionReceipt(req.user, result.transaction)
                .catch(err => console.error('[v1 purchase] Email error:', err));
            sendWebhookNotification(req.user.id, 'transaction.success', {
                reference:   result.transaction.reference,
                serviceName: service.name,
                amount:      finalAmount,
                recipient,
                newBalance:  result.updatedUser.wallet,
                status:      vendResult.status
            }).catch(() => {});

        } else {
            // Refund has already been handled inside vend.service.js on failure
            sendWebhookNotification(req.user.id, 'transaction.failed', {
                reference:   result.transaction.reference,
                serviceName: service.name,
                amount:      finalAmount,
                recipient,
                reason:      vendResult.message
            }).catch(() => {});

            res.status(400).json({
                status:     1,
                message:    'Transaction failed: ' + vendResult.message,
                reference:  result.transaction.reference,
                newBalance: result.updatedUser.wallet + finalAmount // refunded by vend.service
            });
        }

    } catch (error) {
        console.error('[v1/services purchase] Error:', error);
        res.status(500).json({ status: 1, message: 'Transaction failed. Please contact support.' });
    }
});

module.exports = router;
