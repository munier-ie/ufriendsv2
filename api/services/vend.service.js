const prisma = require('../../prisma/client');
const vtpass = require('../utils/providers/vtpass');
const basicProvider = require('../utils/providers/basic'); // N3TData, LegitData, etc.
const topupbox = require('../utils/providers/topupbox');
const subandgain = require('../utils/providers/subandgain');
const maskawasub = require('../utils/providers/maskawasub');
const alrahuz = require('../utils/providers/alrahuz');

// Map of provider functions
const providers = {
    'vtpass': vtpass,
    'n3tdata': basicProvider,
    'n3tdata247': basicProvider,
    'legitdataway': basicProvider,
    'bilalsadasub': basicProvider,
    'rabdata360': basicProvider,
    'topupbox': topupbox,
    'subandgain': subandgain,
    'maskawasub': maskawasub,
    'alrahuzdata': alrahuz,
    'alrahuz': alrahuz
};

/**
 * Sanitize a vend result — if any provider returns a failed response whose
 * message reveals our internal balance/funding status, replace it with
 * a user-friendly "Service Temporarily Unavailable" message.
 */
const BALANCE_KEYWORDS = ['insufficient', 'low balance', 'wallet', 'low fund', 'no fund',
    'not enough', 'insufficient fund', 'account balance', 'recharge', 'top up', 'topup'];

function sanitizeVendResult(result) {
    if (result && result.status === 'failed' && result.message) {
        // Ensure message is a string before calling toLowerCase
        const msgStr = Array.isArray(result.message) ? result.message.join(' ') : String(result.message);
        const msgLower = msgStr.toLowerCase();
        
        if (BALANCE_KEYWORDS.some(kw => msgLower.includes(kw))) {
            return { ...result, message: 'Service Temporarily Unavailable' };
        }
        
        // If it was an array, returning the joined string is also better for UI
        if (Array.isArray(result.message)) {
            return { ...result, message: msgStr };
        }
    }
    return result;
}


/**
 * Shared atomic refund helper
 */
async function refundTransaction(transaction, reason) {
    try {
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 2, // 2 = Failed / Refunded
                    description: `${transaction.description} [FAILED: ${reason}]`
                }
            }),
            prisma.user.update({
                where: { id: transaction.userId },
                data: { wallet: { increment: Math.abs(transaction.amount) } }
            })
        ]);
        console.log(`[Refund] Successfully refunded transaction ${transaction.id} (user: ${transaction.userId}, amount: ${Math.abs(transaction.amount)})`);
    } catch (refErr) {
        console.error(`[Refund Error] Failed to execute atomic refund for transaction ${transaction.id}:`, refErr);
    }
}

/**
 * Standard provider config builder
 */
function getProviderConfig(apiProvider) {
    return {
        baseUrl: apiProvider.baseUrl,
        apiKey: apiProvider.apiKey,
        secretKey: apiProvider.apiToken,
        username: apiProvider.username || '',
        userUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl : null
    };
}

/**
 * Helper to get network ID
 */
function getNetworkIdForProvider(providerKey, network) {
    const net = (network || '').toLowerCase();
    if (providerKey && providerKey.includes('vtpass')) {
        return null;
    }
    // Standard VTU provider mapping: 1=MTN, 2=GLO, 3=9MOBILE, 4=AIRTEL
    const standardMap = { 'mtn': '1', 'glo': '2', '9mobile': '3', 'airtel': '4' };
    return standardMap[net] || '1';
}

/**
 * Parse data capacity in megabytes from string (e.g. '1.0GB' -> 1000, '500MB' -> 500)
 */
function parseDataCapacity(str) {
    if (!str) return null;
    const match = str.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
    if (!match) return null;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'TB') return Math.round(val * 1000000);
    if (unit === 'GB') return Math.round(val * 1000);
    return Math.round(val);
}

/**
 * Normalize data type category
 */
function normalizeDataType(str) {
    if (!str) return 'SME';
    const s = str.toUpperCase();
    if (s.includes('SME2')) return 'SME2';
    if (s.includes('SME')) return 'SME';
    if (s.includes('CORPORATE GIFTING 2') || s.includes('CG2') || s.includes('CG 2')) return 'CORPORATE GIFTING 2';
    if (s.includes('CORPORATE') || s.includes('CG') || s.includes('C.G')) return 'CORPORATE GIFTING';
    if (s.includes('COUPON')) return 'DATA COUPONS';
    if (s.includes('SHARE')) return 'DATA SHARE';
    if (s.includes('AWOOF')) return 'AWOOF GIFTING';
    if (s.includes('GIFTING')) return 'GIFTING';
    return 'SME';
}

/**
 * Resolve clean network name (MTN, GLO, AIRTEL, 9MOBILE)
 */
function resolveEffectiveNetwork(service, fallbackNetwork) {
    if (service?.metadata) {
        try {
            const meta = typeof service.metadata === 'string' ? JSON.parse(service.metadata) : service.metadata;
            if (meta.network && ['MTN', 'GLO', 'AIRTEL', '9MOBILE'].includes(meta.network.toUpperCase())) {
                return meta.network.toUpperCase();
            }
        } catch {}
    }
    const name = (service?.name || '').toUpperCase();
    if (/\b9MOBILE\b|\bETISALAT\b/.test(name)) return '9MOBILE';
    if (/\bMTN\b/.test(name)) return 'MTN';
    if (/\bGLO\b/.test(name)) return 'GLO';
    if (/\bAIRTEL\b/.test(name)) return 'AIRTEL';

    const prov = (service?.provider || '').toUpperCase();
    if (['MTN', 'GLO', 'AIRTEL', '9MOBILE'].includes(prov)) return prov;

    const fb = (fallbackNetwork || '').toUpperCase();
    if (['MTN', 'GLO', 'AIRTEL', '9MOBILE'].includes(fb)) return fb;

    return 'MTN';
}

/**
 * Resolve data type from service metadata or name
 */
function resolveDataType(service) {
    if (service?.metadata) {
        try {
            const meta = typeof service.metadata === 'string' ? JSON.parse(service.metadata) : service.metadata;
            if (meta.dataType) return normalizeDataType(meta.dataType);
        } catch {}
    }
    return normalizeDataType(service?.name || '');
}

/**
 * Compatibility rank between requested type and plan type:
 * Rank 1: Exact match
 * Rank 2: Closely compatible variant
 * Rank 3: Same network & size fallback
 */
function getTypeRank(planType, requestedType) {
    const normPlan = normalizeDataType(planType);
    const normReq = normalizeDataType(requestedType);
    if (normPlan === normReq) return 1;

    if (normReq === 'SME' && normPlan === 'SME2') return 2;
    if (normReq === 'SME2' && normPlan === 'SME') return 2;
    if (normReq === 'CORPORATE GIFTING' && normPlan === 'CORPORATE GIFTING 2') return 2;
    if (normReq === 'CORPORATE GIFTING 2' && normPlan === 'CORPORATE GIFTING') return 2;
    if (normReq === 'GIFTING' && normPlan === 'AWOOF GIFTING') return 2;
    if (normReq === 'AWOOF GIFTING' && normPlan === 'GIFTING') return 2;

    return 3;
}

/**
 * Dynamically translate and locate a provider's plan ID for a given network and capacity
 */
async function findPlanForProvider(providerId, network, capacityMb, dataType, originalCode = null, originalProviderId = null) {
    // Direct match if this candidate is the service's native provider
    if (originalProviderId && providerId === originalProviderId && originalCode) {
        const directPlan = await prisma.dataPlan.findFirst({
            where: { apiProviderId: providerId, planId: String(originalCode), active: true }
        });
        if (directPlan) {
            return {
                planId: directPlan.planId,
                dataName: directPlan.dataName,
                dataType: directPlan.dataType,
                apiPrice: directPlan.apiPrice,
                matchType: 'direct'
            };
        }
    }

    // Query active plans for this provider & network
    const plans = await prisma.dataPlan.findMany({
        where: { apiProviderId: providerId, network: network, active: true }
    });

    const matchingPlans = plans
        .filter(p => parseDataCapacity(p.dataName) === capacityMb)
        .map(p => ({
            ...p,
            rank: getTypeRank(p.dataType, dataType)
        }))
        .sort((a, b) => a.rank - b.rank || a.apiPrice - b.apiPrice);

    if (matchingPlans.length > 0) {
        const best = matchingPlans[0];
        return {
            planId: best.planId,
            dataName: best.dataName,
            dataType: best.dataType,
            apiPrice: best.apiPrice,
            matchType: `rank_${best.rank}`
        };
    }

    return null;
}

/**
 * Resolve the API provider for a given service, network, and network type.
 * 
 * Hierarchy:
 * 1. ProviderRouting (Network + NetworkType specific override)
 * 2. ActiveProvider (Generic active default for serviceType)
 * 3. Service directly (service.apiProviderId fallback)
 */
async function resolveProvider(serviceType, network, networkType, service) {
    let apiProviderId = null;

    // 1. Check ProviderRouting for Network + NetworkType override
    if (network && networkType) {
        let routing = await prisma.providerRouting.findFirst({
            where: {
                serviceType,
                network: network.toUpperCase(),
                networkType: { equals: networkType, mode: 'insensitive' },
                active: true
            }
        });

        // If not found and networkType ends in '2' (e.g. SME2 -> SME, CORPORATE GIFTING 2 -> CORPORATE GIFTING)
        if (!routing && /2$/.test(networkType.trim())) {
            const baseType = networkType.trim().replace(/\s*2$/, '');
            routing = await prisma.providerRouting.findFirst({
                where: {
                    serviceType,
                    network: network.toUpperCase(),
                    networkType: { equals: baseType, mode: 'insensitive' },
                    active: true
                }
            });
        }

        if (routing) apiProviderId = routing.apiProviderId;
    }

    // 2. Check ActiveProvider (system default for this serviceType)
    if (!apiProviderId) {
        const activeProv = await prisma.activeProvider.findUnique({
            where: { serviceType }
        });
        if (activeProv) apiProviderId = activeProv.apiProviderId;
    }

    // 3. Fallback to Service directly
    if (!apiProviderId && service && service.apiProviderId) {
        apiProviderId = service.apiProviderId;
    }

    if (!apiProviderId) return null;

    return await prisma.apiProvider.findUnique({ where: { id: apiProviderId } });
}

/**
 * Vend Airtime with Multi-Provider Runtime Fallback
 * @param {Object} transaction - The transaction object
 * @param {Object} service - The service object
 * @param {string} phone - Recipient phone number
 * @param {string} network - Network name (MTN, GLO, etc)
 * @param {string} airtimeType - VTU, Share, etc.
 */
async function vendAirtime(transaction, service, phone, network, airtimeType = 'VTU') {
    try {
        const effectiveNetwork = resolveEffectiveNetwork(service, network);
        const amount = transaction.faceValue || Math.abs(transaction.amount);
        console.log(`[VendAirtime] Starting airtime vending: Network=${effectiveNetwork}, Amount=₦${amount} (phone redacted)`);

        // 1. Resolve Primary Provider
        const primaryProvider = await resolveProvider('airtime', effectiveNetwork, airtimeType, service);

        // 2. Retrieve all active API providers with wallet balances
        const allActiveProviders = await prisma.apiProvider.findMany({
            where: { active: true },
            include: { apiWallet: true }
        });

        // Filter to providers with a valid purchaseAirtime handler
        const supportedProviders = allActiveProviders.filter(p => {
            const key = p.name.toLowerCase().replace(/\s+/g, '');
            const h = findProviderHandler(key);
            return h && typeof h.purchaseAirtime === 'function';
        });

        // 3. Build prioritized candidate queue (Primary first, followed by others sorted by balance descending)
        const candidates = [];
        if (primaryProvider && supportedProviders.some(p => p.id === primaryProvider.id)) {
            candidates.push(primaryProvider);
        }
        const others = supportedProviders
            .filter(p => !primaryProvider || p.id !== primaryProvider.id)
            .sort((a, b) => {
                const balA = a.apiWallet?.[0]?.balance ?? 0;
                const balB = b.apiWallet?.[0]?.balance ?? 0;
                return balB - balA;
            });
        candidates.push(...others);

        if (candidates.length === 0) {
            console.error('[VendAirtime] No active airtime API provider configured');
            await refundTransaction(transaction, 'No active API Provider configured');
            return { status: 'failed', message: 'No API Provider configured for this airtime service' };
        }

        console.log(`[VendAirtime] Candidates queue: ${candidates.map(c => `${c.name} (ID: ${c.id})`).join(' -> ')}`);

        // 4. Attempt vending across candidate providers in sequence
        const attemptedErrors = [];

        for (const prov of candidates) {
            const providerKey = prov.name.toLowerCase().replace(/\s+/g, '');
            const handler = findProviderHandler(providerKey);
            if (!handler || !handler.purchaseAirtime) continue;

            const config = getProviderConfig(prov);
            const details = {
                network: effectiveNetwork,
                amount: amount,
                phone: phone,
                requestId: transaction.reference,
                airtimeType: airtimeType,
                networkId: getNetworkIdForProvider(providerKey, effectiveNetwork)
            };

            console.log(`[VendAirtime] Attempting vending via ${prov.name}...`);

            try {
                const result = await handler.purchaseAirtime(details, config);

                if (result.status === 'success' || result.status === 'pending') {
                    console.log(`[VendAirtime] SUCCESS via ${prov.name}! Status=${result.status}, Ref=${transaction.reference}`);
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: 0, // 0 = Success
                            description: `${transaction.description} [SUCCESS via ${prov.name}]`
                        }
                    });
                    return sanitizeVendResult(result);
                } else {
                    const errMsg = result.message || 'Transaction rejected';
                    console.warn(`[VendAirtime] Provider ${prov.name} returned failed status: ${errMsg}. Attempting fallback...`);
                    attemptedErrors.push({ provider: prov.name, message: errMsg });
                }
            } catch (provErr) {
                const errMsg = provErr.message || 'Connection error';
                console.warn(`[VendAirtime] Provider ${prov.name} threw exception: ${errMsg}. Attempting fallback...`);
                attemptedErrors.push({ provider: prov.name, message: errMsg });
            }
        }

        // 5. All candidates failed - execute atomic refund
        const lastErrorSummary = attemptedErrors.length > 0
            ? attemptedErrors.map(e => `${e.provider}: ${e.message}`).join(' | ')
            : 'All providers failed';

        console.error(`[VendAirtime] All candidates exhausted for tx ${transaction.id}: ${lastErrorSummary}`);
        await refundTransaction(transaction, lastErrorSummary);

        const clientMessage = attemptedErrors.length > 0
            ? attemptedErrors[attemptedErrors.length - 1].message
            : 'Service Temporarily Unavailable';

        return sanitizeVendResult({ status: 'failed', message: clientMessage });

    } catch (error) {
        console.error('[VendAirtime] System Error:', error);
        await refundTransaction(transaction, 'System Error during airtime vending');
        return { status: 'failed', message: 'System Error during airtime vending' };
    }
}

// Helper to find handler
function findProviderHandler(name) {
    if (!name) return null;
    const normalizedName = name.toLowerCase().replace(/\s+/g, '');
    
    // Check exact match
    if (providers[normalizedName]) return providers[normalizedName];

    // Check partial (e.g. n3tdata matches n3tdata247)
    const keys = Object.keys(providers);
    for (const key of keys) {
        if (normalizedName.includes(key)) return providers[key];
    }
    return null;
}

/**
 * Vend Data with Dynamic Plan ID Translation & Multi-Provider Runtime Fallback
 * @param {Object} transaction - The transaction object
 * @param {Object} service - The service object
 * @param {string} phone - Recipient phone number
 * @param {string} network - Network name (MTN, GLO, etc)
 */
async function vendData(transaction, service, phone, network) {
    try {
        const effectiveNetwork = resolveEffectiveNetwork(service, network);
        const capacityMb = parseDataCapacity(service.name) || 1000;
        const dataType = resolveDataType(service);

        console.log(`[VendData] Starting data vending: Network=${effectiveNetwork}, Capacity=${capacityMb}MB, Type=${dataType} (phone redacted)`);

        // 1. Resolve Primary Routed Provider
        const primaryProvider = await resolveProvider('data', effectiveNetwork, dataType, service);

        // 2. Retrieve all active API providers with wallet balances
        const allActiveProviders = await prisma.apiProvider.findMany({
            where: { active: true },
            include: { apiWallet: true }
        });

        // Filter to providers with a valid purchaseData handler
        const supportedProviders = allActiveProviders.filter(p => {
            const key = p.name.toLowerCase().replace(/\s+/g, '');
            const h = findProviderHandler(key);
            return h && typeof h.purchaseData === 'function';
        });

        // 3. Build prioritized candidate queue (Primary first, then others sorted by balance descending)
        const candidates = [];
        if (primaryProvider && supportedProviders.some(p => p.id === primaryProvider.id)) {
            candidates.push(primaryProvider);
        }
        const others = supportedProviders
            .filter(p => !primaryProvider || p.id !== primaryProvider.id)
            .sort((a, b) => {
                const balA = a.apiWallet?.[0]?.balance ?? 0;
                const balB = b.apiWallet?.[0]?.balance ?? 0;
                return balB - balA;
            });
        candidates.push(...others);

        if (candidates.length === 0) {
            console.error('[VendData] No active data API provider configured');
            await refundTransaction(transaction, 'No active API Provider configured');
            return { status: 'failed', message: 'No API Provider configured for this data service' };
        }

        console.log(`[VendData] Candidates queue: ${candidates.map(c => `${c.name} (ID: ${c.id})`).join(' -> ')}`);

        // 4. Attempt vending across candidate providers with dynamic plan ID translation
        const attemptedErrors = [];

        for (const prov of candidates) {
            const providerKey = prov.name.toLowerCase().replace(/\s+/g, '');
            const handler = findProviderHandler(providerKey);
            if (!handler || !handler.purchaseData) continue;

            // Dynamically translate plan ID for this specific candidate provider
            const matchedPlan = await findPlanForProvider(
                prov.id,
                effectiveNetwork,
                capacityMb,
                dataType,
                service.code,
                service.apiProviderId
            );

            if (!matchedPlan) {
                console.warn(`[VendData] Candidate ${prov.name} (ID: ${prov.id}) has no matching plan for ${effectiveNetwork} ${capacityMb}MB (${dataType}). Skipping to next candidate.`);
                attemptedErrors.push({ provider: prov.name, message: 'No matching plan available on provider' });
                continue;
            }

            const config = getProviderConfig(prov);
            const details = {
                network: effectiveNetwork,
                phone: phone,
                requestId: transaction.reference,
                planId: matchedPlan.planId,
                variationCode: matchedPlan.planId,
                networkId: getNetworkIdForProvider(providerKey, effectiveNetwork)
            };

            console.log(`[VendData] Attempting vending via ${prov.name}: PlanID=${matchedPlan.planId} (${matchedPlan.dataName}, ${matchedPlan.dataType}, ₦${matchedPlan.apiPrice}, ${matchedPlan.matchType})...`);

            try {
                const result = await handler.purchaseData(details, config);

                if (result.status === 'success' || result.status === 'pending') {
                    console.log(`[VendData] SUCCESS via ${prov.name}! Status=${result.status}, Ref=${transaction.reference}`);
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: 0, // 0 = Success
                            description: `${transaction.description} [SUCCESS via ${prov.name}]`
                        }
                    });
                    return sanitizeVendResult(result);
                } else {
                    const errMsg = result.message || 'Transaction rejected';
                    console.warn(`[VendData] Provider ${prov.name} returned failed status: ${errMsg}. Attempting fallback...`);
                    attemptedErrors.push({ provider: prov.name, message: errMsg });
                }
            } catch (provErr) {
                const errMsg = provErr.message || 'Connection error';
                console.warn(`[VendData] Provider ${prov.name} threw exception: ${errMsg}. Attempting fallback...`);
                attemptedErrors.push({ provider: prov.name, message: errMsg });
            }
        }

        // 5. All candidates failed - execute atomic refund
        const lastErrorSummary = attemptedErrors.length > 0
            ? attemptedErrors.map(e => `${e.provider}: ${e.message}`).join(' | ')
            : 'All providers failed or no matching plans';

        console.error(`[VendData] All candidates exhausted for tx ${transaction.id}: ${lastErrorSummary}`);
        await refundTransaction(transaction, lastErrorSummary);

        const clientMessage = attemptedErrors.length > 0
            ? attemptedErrors[attemptedErrors.length - 1].message
            : 'Service Temporarily Unavailable';

        return sanitizeVendResult({ status: 'failed', message: clientMessage });

    } catch (error) {
        console.error('[VendData] System Error:', error);
        await refundTransaction(transaction, 'System Error during data vending');
        return { status: 'failed', message: 'System Error during data vending' };
    }
}

/**
 * Vend Cable/TV Subscription
 * @param {Object} transaction - The transaction object
 * @param {Object} service - The service object
 * @param {string} iuc - IUC/SmartCard number
 * @param {string} phone - Customer phone number
 * @param {string} subscriptionType - change, renew
 * @param {string} accessToken - auth token returned from verification process
 */
async function vendCable(transaction, service, iuc, phone, subscriptionType = 'change', accessToken = null) {
    try {
        console.log(`Attempting to vend TV for ${iuc} using ${service.provider}`);

        let apiProvider = null;
        if (service.apiProviderId) {
            apiProvider = await prisma.apiProvider.findUnique({ where: { id: service.apiProviderId } });
        }

        if (!apiProvider || !apiProvider.name) {
            return { status: 'failed', message: 'No API Provider configured for this TV service' };
        }

        const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, '');
        const handler = findProviderHandler(providerKey);

        if (!handler || !handler.purchaseTV) {
            return { status: 'failed', message: `TV handler not found for ${apiProvider.name}` };
        }

        const config = {
            baseUrl: apiProvider.baseUrl,
            apiKey: apiProvider.apiKey,
            secretKey: apiProvider.apiToken,
            username: apiProvider.username || '',
            verifyUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl.replace('api/user', 'api/cable-verification') : null
        };

        const details = {
            serviceID: service.provider.toLowerCase(), // e.g. 'dstv', 'gotv'
            cableId: service.provider.toLowerCase(),
            variationCode: service.code || service.apiPlanId || service.providerPlanId,
            planId: service.code || service.apiPlanId || service.providerPlanId,
            number: iuc,
            phone: phone,
            requestId: transaction.reference,
            subscriptionType,
            accessToken // ensure accessToken is passed downward
        };

        const result = await handler.purchaseTV(details, config);

        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 0, description: `${transaction.description} [SUCCESS]` } // 0 = Success
            });
        } else if (result.status === 'failed') {
            await prisma.$transaction([
                prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 2, description: `${transaction.description} [FAILED: ${result.message}]` }
                }),
                prisma.user.update({
                    where: { id: transaction.userId },
                    data: { wallet: { increment: Math.abs(transaction.amount) } }
                })
            ]);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('TV Vending Error:', error);
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 2, description: `${transaction.description} [SYSTEM ERROR]` } // 2 = Failed
            }),
            prisma.user.update({
                where: { id: transaction.userId },
                data: { wallet: { increment: Math.abs(transaction.amount) } }
            })
        ]);
        return { status: 'failed', message: 'System Error during TV vending' };
    }
}

/**
 * Vend Electricity Unit
 * @param {Object} transaction - The transaction object
 * @param {Object} service - The service object
 * @param {string} meterNo - Meter number
 * @param {string} phone - Customer phone
 * @param {number} baseAmount - Base electricity amount without admin fee
 * @param {string} meterType - prepaid, postpaid
 * @param {string} accessToken - auth token returned from verify phase
 */
async function vendElectricity(transaction, service, meterNo, phone, baseAmount, meterType = 'prepaid', accessToken = null) {
    try {
        console.log(`Attempting to vend Electricity for ${meterNo} using ${service.provider}`);

        let apiProvider = null;
        if (service.apiProviderId) {
            apiProvider = await prisma.apiProvider.findUnique({ where: { id: service.apiProviderId } });
        }

        if (!apiProvider || !apiProvider.name) {
            return { status: 'failed', message: 'No API Provider configured for this Electricity service' };
        }

        const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, '');
        const handler = findProviderHandler(providerKey);

        if (!handler || !handler.purchaseElectricity) {
            return { status: 'failed', message: `Electricity handler not found for ${apiProvider.name}` };
        }

        const config = {
            baseUrl: apiProvider.baseUrl,
            apiKey: apiProvider.apiKey,
            secretKey: apiProvider.apiToken,
            username: apiProvider.username || '',
            userUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl : null
        };

        const details = {
            serviceID: service.provider.toLowerCase(),
            discoId: service.provider.toLowerCase(),
            variationCode: meterType,
            number: meterNo,
            amount: baseAmount || Math.abs(transaction.amount),
            phone: phone,
            requestId: transaction.reference,
            type: meterType,
            accessToken // ensure accessToken is passed downward
        };

        const result = await handler.purchaseElectricity(details, config);

        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 0, description: `${transaction.description} [SUCCESS] Token: ${result.token || 'N/A'}` } // 0 = Success
            });
        } else if (result.status === 'failed') {
            await prisma.$transaction([
                prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 2, description: `${transaction.description} [FAILED: ${result.message}]` } // 2 = Failed
                }),
                prisma.user.update({
                    where: { id: transaction.userId },
                    data: { wallet: { increment: Math.abs(transaction.amount) } }
                })
            ]);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('Electricity Vending Error:', error);
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 2, description: `${transaction.description} [SYSTEM ERROR]` } // 2 = Failed
            }),
            prisma.user.update({
                where: { id: transaction.userId },
                data: { wallet: { increment: Math.abs(transaction.amount) } }
            })
        ]);
        return { status: 'failed', message: 'System Error during electricity vending' };
    }
}

/**
 * Vend Exam Pin
 * @param {Object} transaction - The transaction object
 * @param {Object} service - The service object
 * @param {number} quantity
 * @param {string} phone - Recipient phone
 */
// Map quantity number to provider eduType codes
const NECO_QTY_MAP = { 1: 'NEONE', 2: 'NETWO', 3: 'NETHR', 4: 'NEFOUR', 5: 'NEFIVE' };
const WAEC_QTY_MAP = { 1: 'WAONE', 2: 'WATWO', 3: 'WATHR', 4: 'WAFOUR', 5: 'WAFIVE' };

function getExamEduTypeCode(examType, quantity) {
    const type = (examType || '').toUpperCase();
    const qty = parseInt(quantity) || 1;

    if (type.includes('NECO')) return NECO_QTY_MAP[qty] || `NEFIVE`;
    if (type.includes('WAEC')) return WAEC_QTY_MAP[qty] || `WAFIVE`;
    // Fallback: return quantity as-is for other exam types
    return qty;
}

async function vendExam(transaction, service, quantity, phone) {
    try {
        console.log(`Attempting to vend Exam Pin using ${service.provider} (phone redacted)`);

        let apiProvider = null;
        if (service.apiProviderId) {
            apiProvider = await prisma.apiProvider.findUnique({ where: { id: service.apiProviderId } });
        }

        if (!apiProvider || !apiProvider.name) {
            return { status: 'failed', message: 'No API Provider configured for this Exam service' };
        }

        const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, '');
        const handler = findProviderHandler(providerKey);

        if (!handler || !handler.purchaseExam) {
            return { status: 'failed', message: `Exam handler not found for ${apiProvider.name}` };
        }

        const config = {
            baseUrl: apiProvider.baseUrl,
            apiKey: apiProvider.apiKey,
            secretKey: apiProvider.apiToken,
            username: apiProvider.username || '',
            userUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl : null
        };

        // If the service already has the eduType code (e.g. NEONE, WATWO) in service.code,
        // use it directly. Otherwise fall back to deriving it from examType + quantity.
        let eduTypeCode;
        if (service.code && /^(NE|WA|NA)(ONE|TWO|THR|FOUR|FIVE)/i.test(service.code)) {
            eduTypeCode = service.code.toUpperCase();
        } else {
            const examType = service.provider || service.examType || service.name || '';
            eduTypeCode = getExamEduTypeCode(examType, quantity);
        }

        console.log(`[ExamVend] service.code=${service.code}, eduTypeCode=${eduTypeCode}`);

        const details = {
            serviceID: service.provider.toLowerCase(),
            examId: service.provider.toLowerCase(),
            variationCode: service.apiPlanId || service.providerPlanId,
            quantity: quantity,
            eduType: eduTypeCode,   // Provider-specific quantity code (NEONE, WATWO etc.)
            phone: phone,
            requestId: transaction.reference
        };

        const result = await handler.purchaseExam(details, config);

        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 0, // 0 = Success
                    pinContent: result.pin || result.token,
                    description: `${transaction.description} [SUCCESS] PIN: ${result.pin || result.token || 'N/A'}`
                }
            });
        } else if (result.status === 'failed') {
            await prisma.$transaction([
                prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 1, description: `${transaction.description} [FAILED: ${result.message}]` } // 1 = Failed
                }),
                prisma.user.update({
                    where: { id: transaction.userId },
                    data: { wallet: { increment: Math.abs(transaction.amount) } }
                })
            ]);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('Exam Vending Error:', error);
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 2, description: `${transaction.description} [SYSTEM ERROR]` } // 2 = Failed
            }),
            prisma.user.update({
                where: { id: transaction.userId },
                data: { wallet: { increment: Math.abs(transaction.amount) } }
            })
        ]);
        return { status: 'failed', message: 'System Error during exam vending' };
    }
}

/**
 * Vend Data Pin
 * @param {Object} transaction - The transaction object
 * @param {Object} service - The service object
 * @param {number} quantity
 * @param {string} phone - Recipient phone
 * @param {string} businessName - Card name/Business name
 */
async function vendDataPin(transaction, service, quantity, phone, businessName) {
    try {
        console.log(`Attempting to vend Data Pin using ${service.provider} (phone redacted)`);

        let apiProvider = null;
        if (service.apiProviderId) {
            apiProvider = await prisma.apiProvider.findUnique({ where: { id: service.apiProviderId } });
        }

        if (!apiProvider || !apiProvider.name) {
            return { status: 'failed', message: 'No API Provider configured for this Data Pin service' };
        }

        const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, '');
        const handler = findProviderHandler(providerKey);

        if (!handler || !handler.purchaseDataPin) {
            return { status: 'failed', message: `Data Pin handler not found for ${apiProvider.name}` };
        }

        const config = {
            baseUrl: apiProvider.baseUrl,
            apiKey: apiProvider.apiKey,
            secretKey: apiProvider.apiToken,
            username: apiProvider.username || '',
            userUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl : null
        };

        const details = {
            network: service.provider.toLowerCase(),
            networkId: await getNetworkIdForProvider(providerKey, service.provider),
            planId: service.code || service.apiPlanId || service.providerPlanId,  // code holds the plan ID (e.g. '408')
            variationCode: service.code || service.apiPlanId || service.providerPlanId,
            quantity: quantity,
            phone: phone,
            businessName: businessName,
            requestId: transaction.reference
        };

        const result = await handler.purchaseDataPin(details, config);

        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 0, // 0 = Success
                    pinContent: result.pin || result.token,
                    description: `${transaction.description} [SUCCESS] PIN: ${result.pin || result.token || 'N/A'}`
                }
            });
        } else if (result.status === 'failed') {
            await prisma.$transaction([
                prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 1, description: `${transaction.description} [FAILED: ${result.message}]` } // 1 = Failed
                }),
                prisma.user.update({
                    where: { id: transaction.userId },
                    data: { wallet: { increment: Math.abs(transaction.amount) } }
                })
            ]);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('Data Pin Vending Error:', error);
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 2, description: `${transaction.description} [SYSTEM ERROR]` } // 2 = Failed
            }),
            prisma.user.update({
                where: { id: transaction.userId },
                data: { wallet: { increment: Math.abs(transaction.amount) } }
            })
        ]);
        return { status: 'failed', message: 'System Error during data pin vending' };
    }
}

/**
 * Vend Recharge Card Pins (E-Pin)
 */
async function vendEPin(transaction, service, quantity, phone, businessName) {
    try {
        console.log(`Attempting to vend E-Pin using ${service.provider}`);

        let apiProvider = null;
        if (service.apiProviderId) {
            apiProvider = await prisma.apiProvider.findUnique({ where: { id: service.apiProviderId } });
        }

        if (!apiProvider || !apiProvider.name) {
            return { status: 'failed', message: 'No API Provider configured for this E-Pin service' };
        }

        const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, '');
        const handler = findProviderHandler(providerKey);

        if (!handler || !handler.purchaseEPin) {
            return { status: 'failed', message: `EPin handler not found for ${apiProvider.name}` };
        }

        const config = {
            baseUrl: apiProvider.baseUrl,
            apiKey: apiProvider.apiKey,
            secretKey: apiProvider.apiToken,
            username: apiProvider.username || '',
            userUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl : null
        };

        const details = {
            network: service.provider.toLowerCase(),
            denomination: service.price,
            name: businessName || 'VTU App',
            quantity: quantity
        };

        const result = await handler.purchaseEPin(details, config);

        if (result.status === 'success') {
            const pinContent = result.pins.map(p => `${p.token} (${p.serial})`).join(', ');

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 0, // 0 = Success
                    pinContent: pinContent,
                    description: `${transaction.description} [SUCCESS] Pins: ${pinContent}`
                }
            });
        } else if (result.status === 'failed') {
            await prisma.$transaction([
                prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { status: 1, description: `${transaction.description} [FAILED: ${result.message}]` } // 1 = Failed
                }),
                prisma.user.update({
                    where: { id: transaction.userId },
                    data: { wallet: { increment: Math.abs(transaction.amount) } }
                })
            ]);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('EPin Vending Error:', error);
        await prisma.$transaction([
            prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 2, description: `${transaction.description} [SYSTEM ERROR]` } // 2 = Failed
            }),
            prisma.user.update({
                where: { id: transaction.userId },
                data: { wallet: { increment: Math.abs(transaction.amount) } }
            })
        ]);
        return { status: 'failed', message: 'System Error during EPin vending' };
    }
}

module.exports = { vendAirtime, vendData, vendCable, vendElectricity, vendExam, vendDataPin, vendEPin };

