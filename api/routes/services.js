const express = require('express');
const router = express.Router();
const prisma = require('../../prisma/client');
const authenticateUser = require('../middleware/auth');
const { z } = require('zod');
const crypto = require('crypto');
const { creditReferralBonus } = require('../services/referral.service');
const { sendTransactionReceipt } = require('../services/email.service');

// Validation schemas
const purchaseSchema = z.object({
    serviceId: z.number(),
    recipient: z.string().trim().min(5),
    amount: z.number().positive(),
    pin: z.string().length(4),
    networkType: z.string().optional(), // VTU, Share, Momo (case insensitive)
    // Additional fields for validation
    metadata: z.record(z.any()).optional() // For IUC/Meter names matches, etc.
}).passthrough();

// Verification Schema
const verifyServiceSchema = z.object({
    type: z.enum(['cable', 'electricity']),
    provider: z.string(),
    number: z.string().min(5)
});

// Verify Cable/Electricity (IUC/Meter)
router.post('/verify', authenticateUser, async (req, res) => {
    try {
        const validation = verifyServiceSchema.safeParse(req.body);
        if (!validation.success) {
            const firstError = validation.error.issues?.[0]?.message || 'Invalid request data';
            return res.status(400).json({ error: firstError });
        }

        const { type, provider, number } = validation.data;
        const { verifyUtility } = require('../services/verify.service');

        const result = await verifyUtility(type, provider, number, req.body.meterType);

        if (result.valid) {
            res.json(result);
        } else {
            res.status(400).json({ error: result.message || 'Verification failed' });
        }

    } catch (error) {
        console.error('Service verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Get all services with pricing for all tiers
router.get('/all', authenticateUser, async (req, res) => {
    try {
        const [
            services,
            manualPrices,
            verification,
            alphaRate,
            airtimeCashRates
        ] = await Promise.all([
            prisma.service.findMany({ where: { active: true } }),
            prisma.manualServicePrice.findMany({ where: { active: true } }),
            prisma.verificationSettings.findFirst(),
            prisma.alphaTopupRate.findFirst({ where: { active: true } }),
            prisma.airtimeToCashRate.findMany({ where: { active: true } })
        ]);

        const allServices = [];

        // 1. Standard Services (includes exam type now from Service table)
        services.forEach(s => {
            allServices.push({
                id: `std-${s.id}`,
                name: s.name,
                type: s.type,
                price: s.price,
                agentPrice: s.agentPrice,
                vendorPrice: s.vendorPrice
            });
        });

        // 3. Manual Services
        manualPrices.forEach(m => {
            allServices.push({
                id: `manual-${m.id}`,
                name: `${m.serviceType} ${m.subType ? `(${m.subType})` : ''}`,
                type: 'manual',
                price: m.userPrice,
                agentPrice: m.agentPrice,
                vendorPrice: m.vendorPrice
            });
        });

        // 4. Gov Services (BVN/NIN)
        if (verification) {
            if (verification.active) {
                allServices.push({
                    id: 'gov-bvn',
                    name: 'BVN Verification / Slip',
                    type: 'gov',
                    price: verification.bvnUserPrice,
                    agentPrice: verification.bvnAgentPrice,
                    vendorPrice: verification.bvnVendorPrice
                });
            }
            if (verification.ninActive) {
                allServices.push({
                    id: 'gov-nin-reg',
                    name: 'NIN Regular Slip',
                    type: 'gov',
                    price: verification.ninRegularUserPrice,
                    agentPrice: verification.ninRegularAgentPrice,
                    vendorPrice: verification.ninRegularVendorPrice
                });
                allServices.push({
                    id: 'gov-nin-std',
                    name: 'NIN Standard Slip',
                    type: 'gov',
                    price: verification.ninStandardUserPrice,
                    agentPrice: verification.ninStandardAgentPrice,
                    vendorPrice: verification.ninStandardVendorPrice
                });
                allServices.push({
                    id: 'gov-nin-pre',
                    name: 'NIN Premium Slip',
                    type: 'gov',
                    price: verification.ninPremiumUserPrice,
                    agentPrice: verification.ninPremiumAgentPrice,
                    vendorPrice: verification.ninPremiumVendorPrice
                });
            }
        }

        // 5. Alpha Topup
        if (alphaRate) {
            allServices.push({
                id: 'alpha-topup',
                name: 'Alpha Topup',
                type: 'alpha',
                price: alphaRate.userRate, // Note: these are rates (multipliers or absolute?) - usually absolute for topup
                agentPrice: alphaRate.agentRate,
                vendorPrice: alphaRate.vendorRate
            });
        }

        // 6. Airtime to Cash
        airtimeCashRates.forEach(r => {
            allServices.push({
                id: `aircash-${r.id}`,
                name: `Airtime to Cash (${r.network})`,
                type: 'airtime_cash',
                price: r.rate, // This is a percentage, UI should handle display
                agentPrice: r.rate,
                vendorPrice: r.rate
            });
        });

        res.json({ services: allServices });
    } catch (error) {
        console.error('Fetch all services error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get services by type
router.get('/:type', authenticateUser, async (req, res) => {
    try {
        const { type } = req.params;
        const userType = req.user.type; // 1=Regular, 2=Agent, 3=Vendor

        // Exam pins now live in the unified Service table (type='exam')
        // code = eduType (NEONE, WATWO etc.), provider = exam board (NECO, WAEC)
        if (type === 'exam') {
            const examServices = await prisma.service.findMany({
                where: { type: 'exam', active: true },
                include: { apiProvider: { select: { name: true } } },
                orderBy: [{ provider: 'asc' }, { code: 'asc' }]
            });

            // Build human-readable quantity from the eduType code
            const QTY_MAP = {
                'NEONE': 1, 'NETWO': 2, 'NETHR': 3, 'NEFOUR': 4, 'NEFIVE': 5,
                'WAONE': 1, 'WATWO': 2, 'WATHR': 3, 'WAFOUR': 4, 'WAFIVE': 5
            };

            const services = examServices.map(s => {
                let price = s.price;
                if (userType === 2 && s.agentPrice) price = s.agentPrice;
                if (userType === 3 && s.vendorPrice) price = s.vendorPrice;

                const qty = QTY_MAP[s.code] || 1;
                const examBoard = s.provider || s.name.replace(/ONE|TWO|THR|FOUR|FIVE|WA|NE/g, '') || 'EXAM';

                return {
                    id: s.id,
                    name: `${examBoard} - ${qty} Token${qty > 1 ? 's' : ''}`,
                    type: 'exam',
                    provider: s.provider,
                    code: s.code,         // eduType: NEONE, WATWO etc.
                    examType: s.provider, // NECO, WAEC
                    quantity: qty,
                    price,
                    active: s.active,
                    apiProviderId: s.apiProviderId
                };
            });

            return res.json({ services });
        }

        const activeProvider = await prisma.activeProvider.findUnique({
            where: { serviceType: type }
        });

        const activeProviderId = activeProvider ? activeProvider.apiProviderId : null;

        // Fetch active routing rules with full Provider details
        const routingOverrides = await prisma.providerRouting.findMany({
            where: { serviceType: type, active: true }
        });

        // We fetch ALL services for this type because we will filter them in memory
        let allServices = await prisma.service.findMany({
            where: { type, active: true },
            orderBy: { name: 'asc' }
        });

        let dataPlansMap = {};
        if (type === 'data') {
            const dataPlans = await prisma.dataPlan.findMany();
            dataPlans.forEach(dp => {
                dataPlansMap[dp.planId] = {
                    network: dp.network,
                    dataType: dp.dataType
                };
            });
        }

        const extractNetworkInfo = (service) => {
            if (type === 'data') {
                const dp = dataPlansMap[service.code];
                if (dp) return { network: dp.network, networkType: dp.dataType };
            } else if (type === 'airtime') {
                return { network: service.provider, networkType: 'VTU' }; // Simplification for airtime
            }
            return { network: service.provider, networkType: null };
        };

        const filteredServices = allServices.filter(service => {
            // Unmapped generic services bypass strict routing (e.g. system fees)
            if (service.apiProviderId === null) return true;

            const { network, networkType } = extractNetworkInfo(service);

            // 1. Is there an advanced override for this exact network and type?
            const override = routingOverrides.find(r =>
                r.network.toUpperCase() === (network || '').toUpperCase() &&
                r.networkType.toUpperCase() === (networkType || '').toUpperCase()
            );

            if (override) {
                // If an override exists for THIS network/type, we ONLY show the service if it belongs to the overridden provider
                return service.apiProviderId === override.apiProviderId;
            } else {
                // If NO override exists, we ONLY show the service if it belongs to the GLOBAL default provider
                return service.apiProviderId === activeProviderId;
            }
        });

        let services = filteredServices;

        // Adjust prices based on user type
        const adjustedServices = services.map(s => {
            let userPrice = s.price;
            if (userType === 2 && s.agentPrice) userPrice = s.agentPrice;
            if (userType === 3 && s.vendorPrice) userPrice = s.vendorPrice;

            return {
                ...s,
                price: userPrice
            };
        });

        res.json({ services: adjustedServices });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Purchase service
router.post('/purchase', authenticateUser, async (req, res) => {
    try {
        const validation = purchaseSchema.safeParse(req.body);
        if (!validation.success) {
            const firstIssue = validation.error.issues?.[0]?.message || 'Invalid request data';
            return res.status(400).json({ error: firstIssue });
        }

        const { serviceId, recipient, amount, pin, networkType } = validation.data;

        console.log(`[Purchase] User: ${req.user.email}, Input PIN: '${pin}'`);
        console.log(`[Purchase] Has TransactionPin: ${!!req.user.transactionPin}, Has Legacy PIN: ${!!req.user.pin}`);

        // 1. Verify PIN
        // Prioritize hashed transactionPin if available
        if (req.user.transactionPin) {
            const bcrypt = require('bcryptjs');
            const valid = await bcrypt.compare(pin, req.user.transactionPin);
            console.log(`[Purchase] Hashed PIN match: ${valid}`);

            if (!valid) {
                return res.status(400).json({ error: 'Invalid transaction PIN' });
            }
        }
        // Fallback to legacy plain text pin (if transactionPin is not set)
        else if (req.user.pin && req.user.pin !== pin) {
            console.log(`[Purchase] Legacy PIN mismatch. Expected: ${req.user.pin}, Got: ${pin}`);
            return res.status(400).json({ error: 'Invalid transaction PIN' });
        }
        // If neither is set, fail? Or allow if no pin set? (Security risk, but user might be new)
        else if (!req.user.pin && !req.user.transactionPin) {
            console.log('[Purchase] No PIN set on account');
            return res.status(400).json({ error: 'No transaction PIN set. Please go to settings.' });
        }

        // 2. Get Service
        const service = await prisma.service.findUnique({ where: { id: serviceId } });
        if (!service || !service.active) {
            return res.status(404).json({ error: 'Service not available' });
        }

        // 2.5 Validation for specific service types
        if (service.type === 'cable' && !req.body.iucNumber) {
            return res.status(400).json({ error: 'IUC/SmartCard Number is required for Cable TV' });
        }
        if (service.type === 'electricity' && !req.body.meterNumber) {
            return res.status(400).json({ error: 'Meter Number is required for Electricity' });
        }

        // 3. Determine correct price based on user type
        let userPrice = service.price;
        if (req.user.type === 2 && service.agentPrice) userPrice = service.agentPrice;
        if (req.user.type === 3 && service.vendorPrice) userPrice = service.vendorPrice;

        let finalAmount;
        if (service.type === 'airtime') {
            // Check for global airtime discount from settings
            const settingsService = require('../services/settings.service');
            const globalDiscounts = await settingsService.getSetting('airtimeDiscount', {});
            const network = service.provider.toLowerCase();
            const globalDiscount = globalDiscounts[network];

            if (globalDiscount !== undefined) {
                // If global discount is set to 2.5%, user pays 97.5%
                finalAmount = amount * ((100 - globalDiscount) / 100);
            } else {
                // Fallback to service price (percentage based)
                finalAmount = amount * (userPrice / 100);
            }
        } else if (service.type === 'electricity') {
            // Electricity is a variable amount input by the user. 
            // userPrice (service.price) represents the fixed service charge (e.g. N100 fee).
            finalAmount = amount + userPrice;
        } else {
            // For cable, data, exams - the price is strictly defined by the plan (userPrice) * quantity
            const qty = validation.data.quantity || 1;
            finalAmount = userPrice * qty;
        }

        // 4. Check Balance
        if (req.user.wallet < finalAmount) {
            return res.status(400).json({ error: `Insufficient wallet balance. You need ₦${finalAmount.toFixed(2)}` });
        }

        // 5. Calculate Profit
        let profit = 0;
        if (service.type === 'airtime') {
            // API Price is also a percentage (what the admin pays, e.g. 96%).
            const apiCostPercentage = service.apiPrice || userPrice;
            const adminCost = amount * (apiCostPercentage / 100);
            profit = finalAmount - adminCost;
        } else if (service.type === 'electricity') {
            // Profit is the service charge collected from user minus any API charge
            profit = userPrice - (service.apiPrice || 0);
        } else {
            const qty = validation.data.quantity || 1;
            profit = service.apiPrice ? (finalAmount - (service.apiPrice * qty)) : 0;
        }

        // 6. Execute Transaction (Atomic Deduction)
        const result = await prisma.$transaction(async (tx) => {
            // Deduct user balance
            const updatedUser = await tx.user.update({
                where: { id: req.user.id },
                data: { wallet: { decrement: finalAmount } }
            });

            // Create transaction record (PENDING)
            const transaction = await tx.transaction.create({
                data: {
                    reference: crypto.randomUUID(),
                    serviceName: service.name,
                    description: `${service.name} purchase for ${recipient}`,
                    amount: -finalAmount,
                    status: 0, // 0 = Pending/Success (We'll update to 1 for Success, 2 for Fail)
                    oldBalance: req.user.wallet,
                    newBalance: req.user.wallet - finalAmount,
                    profit: profit,
                    userId: req.user.id
                }
            });

            return { transaction, updatedUser };
        });

        // 7. Call Vend Service
        const { vendAirtime, vendData, vendCable, vendElectricity } = require('../services/vend.service');

        // Determine network/provider name from service provider field
        const providerName = service.provider;

        let vendResult;
        if (service.type === 'airtime') {
            vendResult = await vendAirtime(
                result.transaction,
                service,
                recipient,
                providerName,
                req.body.networkType || 'VTU'
            );
        } else if (service.type === 'data') {
            vendResult = await vendData(
                result.transaction,
                service,
                recipient,
                providerName
            );
        } else if (service.type === 'cable') {
            vendResult = await vendCable(
                result.transaction,
                service,
                req.body.iucNumber,
                recipient,
                req.body.subscriptionType,
                req.body.accessToken
            );
        } else if (service.type === 'electricity') {
            vendResult = await vendElectricity(
                result.transaction,
                service,
                req.body.meterNumber || req.body.iucNumber, // frontend might use either
                recipient,
                amount, // Explicitly pass base amount via validation
                req.body.meterType || 'prepaid',
                req.body.accessToken
            );
        } else {
            vendResult = { status: 'success', message: 'Purchase processed (mock)' };
        }

        if (vendResult.status === 'success' || vendResult.status === 'pending') {
            res.json({
                message: 'Purchase successful',
                transaction: result.transaction,
                newBalance: result.updatedUser.wallet,
                providerResponse: vendResult.data
            });

            // Post-process: Referral, Email
            let referralCommission = service.referralCommission || undefined; // Use db default if null
            if (service.type === 'data') {
                if (typeof service.referralCommission === 'number' && service.referralCommission > 0) {
                    referralCommission = (amount * service.referralCommission) / 100;
                }
            } else if (referralCommission === 0) {
                referralCommission = undefined; // allow falling back to env vars if explicitly 0
            }

            creditReferralBonus(req.user.id, service.type, referralCommission).catch(err => console.error('Bonus error:', err));
            sendTransactionReceipt(req.user, result.transaction).catch(err => console.error('Email error:', err));

        } else {
            res.status(400).json({
                error: 'Transaction Failed: ' + vendResult.message,
                newBalance: result.updatedUser.wallet + finalAmount // It was refunded in vendAirtime
            });
        }

    } catch (error) {
        console.error('Purchase error:', error.message);
        console.error('Purchase error stack:', error.stack);
        res.status(500).json({ error: 'Transaction failed: ' + (error.message || 'Please contact support.') });
    }
});

module.exports = router;
