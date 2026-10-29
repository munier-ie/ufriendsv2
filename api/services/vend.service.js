const prisma = require('../../prisma/client');
const walletOps = require('./wallet.service');
const providerAttempts = require('./providerAttempt.service');
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

// A provider balance is useful for routing only while it is fresh.  Do not
// reject a provider merely because an old, locally recorded balance is low:
// the provider may have been funded since the last balance check.
const PROVIDER_BALANCE_FRESHNESS_MS = 15 * 60 * 1000;

function hasFreshInsufficientProviderBalance(provider, requiredAmount) {
    const wallet = provider?.apiWallet?.[0];
    if (!wallet || !Number.isFinite(Number(wallet.balance)) || !wallet.lastChecked) return false;

    const checkedAt = new Date(wallet.lastChecked).getTime();
    if (!Number.isFinite(checkedAt) || Date.now() - checkedAt > PROVIDER_BALANCE_FRESHNESS_MS) return false;

    // A newly created ApiWallet starts at zero before it has ever been
    // synchronised. Treat that as unknown rather than blocking a provider
    // that may already have been funded externally.
    return Number(wallet.balance) > 0 && Number(wallet.balance) < Number(requiredAmount);
}

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
 * Shared atomic refund helper — restores wallet balance and records audit trail + admin alert
 */
async function refundTransaction(transaction, reason) {
    try {
        const result = await prisma.$transaction(tx => walletOps.refundInTransaction(
            tx,
            transaction.reference,
            `Vending refund: ${transaction.description} (${reason})`
        ));

        console.log('[Refund] Transaction refund processed');
    } catch (refErr) {
        console.error(`[Refund Error] Failed to execute atomic refund for transaction ${transaction.id}:`, refErr);
        throw refErr;
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

    // Providers use both decimal (10GB = 10,000MB) and binary
    // (10GB = 10,240MB) labels for the same commercial bundle. Normalize
    // binary-GB MB labels (including fractional like 2560MB = 2.5GB -> 2500MB)
    // before comparing provider catalogs.
    const mb = Math.round(val);
    if (mb >= 512 && (mb % 256 === 0 || mb % 512 === 0)) {
        return Math.round((mb / 1024) * 1000);
    }
    return mb;
}

function isCapacityMatch(candMb, targetMb) {
    if (candMb === null || targetMb === null) return false;
    if (candMb === targetMb) return true;
    const diff = Math.abs(candMb - targetMb);
    return diff <= 50 || (diff / targetMb) <= 0.05;
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
    if (s.includes('AWOOF')) return 'DATA AWOOF';
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
    // Social plans must be detected here so resolveProvider routes them
    // to the SOCIAL routing override, matching the listing normalizer.
    if (isSocialPlan(service?.name || '')) return 'SOCIAL';
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
    if ((normReq === 'DATA AWOOF' || normReq === 'AWOOF GIFTING') && (normPlan === 'DATA AWOOF' || normPlan === 'AWOOF GIFTING')) return 1;
    if (normReq === 'GIFTING' && (normPlan === 'AWOOF GIFTING' || normPlan === 'DATA AWOOF')) return 2;
    if ((normReq === 'AWOOF GIFTING' || normReq === 'DATA AWOOF') && normPlan === 'GIFTING') return 2;

    return 3;
}

const { isSocialPlan } = require('../utils/planFormatter');

/**
 * Dynamically translate and locate a provider's plan ID for a given network and capacity
 */
async function findPlanForProvider(providerId, network, capacityMb, dataType, originalCode = null, originalProviderId = null, service = null) {
    // Determine constraints of the original requested service
    const serviceName = service?.name || '';
    let serviceDuration = '';
    if (service?.metadata) {
        try {
            const meta = typeof service.metadata === 'string' ? JSON.parse(service.metadata) : service.metadata;
            serviceDuration = meta.duration || '';
        } catch {}
    }
    const combinedOriginal = `${serviceName} ${serviceDuration}`;
    const originalIsSocial = isSocialPlan(combinedOriginal) || isSocialPlan(dataType);
    
    // Check if original plan is a 30-day (monthly) plan
    const originalIsShortTerm = /1\s*day|2\s*day|3\s*day|7\s*day|weekly|daily/i.test(combinedOriginal);
    const originalIsMonthly = /30\s*days?|30day|month/i.test(combinedOriginal) || (!originalIsShortTerm && (dataType.includes('CORPORATE') || dataType.includes('SME')));

    // Query active plans for this provider & network
    const plans = await prisma.dataPlan.findMany({
        where: { apiProviderId: providerId, network: network, active: true }
    });

    const matchingPlans = plans
        .filter(p => isCapacityMatch(parseDataCapacity(p.dataName), capacityMb))
        .filter(p => {
            const candName = p.dataName || '';
            const candDuration = `${p.duration || ''} ${candName}`.toLowerCase();
            const candIsSocial = isSocialPlan(candName) || isSocialPlan(p.dataType) || isSocialPlan(p.duration || '');

            // [CRIT-GUARD 1] Social Plan mismatch protection:
            // A regular browsing plan must NEVER be fulfilled with a social plan!
            if (!originalIsSocial && candIsSocial) return false;
            // A social plan must not be fulfilled with a regular plan
            if (originalIsSocial && !candIsSocial) return false;

            // [CRIT-GUARD 2] Validity mismatch protection:
            // A 30-day/monthly plan must NEVER be fulfilled with a 1-day, 2-day, or 7-day plan!
            // Exception: If this candidate is the service's direct native plan (same provider & planId),
            // do not reject it for duration heuristics.
            const isDirectNativePlan = originalProviderId === providerId && originalCode && String(p.planId) === String(originalCode);
            if (originalIsMonthly && !isDirectNativePlan) {
                const candIsShort = /1\s*day|2\s*day|3\s*day|7\s*day|weekly|daily/i.test(candDuration);
                if (candIsShort) return false;
            }

            // [CRIT-GUARD 3] Type Compatibility protection:
            // Only allow rank 1 (exact) or rank 2 (compatible variant, e.g. SME <-> SME2, Corporate <-> Corporate 2).
            // Reject rank 3 (cross-category wild downgrade).
            const rank = (originalIsSocial && candIsSocial) ? 1 : getTypeRank(p.dataType, dataType);
            if (rank > 2) return false;

            return true;
        })
        .map(p => {
            const candIsSocial = isSocialPlan(p.dataName || '') || isSocialPlan(p.dataType) || isSocialPlan(p.duration || '');
            const rank = (originalIsSocial && candIsSocial) ? 1 : getTypeRank(p.dataType, dataType);
            return {
                ...p,
                rank
            };
        })
        .sort((a, b) => a.rank - b.rank || a.apiPrice - b.apiPrice);

    if (matchingPlans.length > 0) {
        // A native plan ID is only safe when its current catalog metadata still
        // matches the requested network, size, category, and validity.
        const directPlan = originalProviderId === providerId && originalCode
            ? matchingPlans.find(plan => String(plan.planId) === String(originalCode))
            : null;
        const best = directPlan || matchingPlans[0];
        return {
            planId: best.planId,
            dataName: best.dataName,
            dataType: best.dataType,
            apiPrice: best.apiPrice,
            matchType: directPlan ? 'direct_verified' : `rank_${best.rank}`
        };
    }

    return null;
}

/**
 * Resolve the API provider for a given service, network, and network type.
 * 
 * Hierarchy:
 * 1. ProviderRouting (Network + NetworkType specific override)
 * 2. Service directly (service.apiProviderId native provider)
 * 3. ActiveProvider (Generic active default for serviceType fallback)
 */
async function resolveProvider(serviceType, network, networkType, service) {
    let apiProviderId = null;

    // 1. Check ProviderRouting for Network + NetworkType override
    if (network && networkType) {
        const variants = [networkType];
        if (networkType === 'DATA AWOOF') variants.push('AWOOF GIFTING');
        if (networkType === 'AWOOF GIFTING') variants.push('DATA AWOOF');

        let routing = await prisma.providerRouting.findFirst({
            where: {
                serviceType,
                network: network.toUpperCase(),
                networkType: { in: variants, mode: 'insensitive' },
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

        // SOCIAL networkType: look for routing entries with 'SOCIAL' in networkType
        // This bridges the listing (which uses isSocialPlan -> 'SOCIAL' category)
        // with the vending layer, ensuring social plans route to the same provider.
        if (!routing && networkType.toUpperCase() === 'SOCIAL') {
            routing = await prisma.providerRouting.findFirst({
                where: {
                    serviceType,
                    network: network.toUpperCase(),
                    networkType: { contains: 'SOCIAL', mode: 'insensitive' },
                    active: true
                }
            });
        }

        if (routing) apiProviderId = routing.apiProviderId;
    }

    // 2. Fallback to Service's native provider directly if configured
    if (!apiProviderId && service && service.apiProviderId) {
        apiProviderId = service.apiProviderId;
    }

    // 3. Fallback to ActiveProvider generic default for this serviceType
    if (!apiProviderId) {
        const activeProv = await prisma.activeProvider.findUnique({
            where: { serviceType }
        });
        if (activeProv) apiProviderId = activeProv.apiProviderId;
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
                const result = await providerAttempts.execute(transaction, prov.id, () => handler.purchaseAirtime(details, config));

                if (result.status === 'success' || result.status === 'pending') {
                    console.log(`[VendAirtime] Successful via ${prov.name}`);
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: result.status === 'pending' ? 1 : 0, // 0 = Success
                            description: `${transaction.description} [${result.status.toUpperCase()} via ${prov.name}]`
                        }
                    });
                    return sanitizeVendResult(result);
                } else {
                    const errMsg = result.message || 'Transaction rejected';
                    console.warn(`[VendAirtime] Provider ${prov.name} returned failed status: ${errMsg}. Attempting fallback...`);
                    attemptedErrors.push({ provider: prov.name, message: errMsg });
                }
            } catch (provErr) {
                return providerAttempts.pending(transaction, 'Airtime provider outcome could not be finalized.');
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
        return providerAttempts.pending(transaction, 'System Error during airtime vending');
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
                service.apiProviderId,
                service
            );

            if (!matchedPlan) {
                console.warn(`[VendData] Candidate ${prov.name} (ID: ${prov.id}) has no matching plan for ${effectiveNetwork} ${capacityMb}MB (${dataType}). Skipping to next candidate.`);
                attemptedErrors.push({ provider: prov.name, message: 'No matching plan available on provider' });
                continue;
            }

            // Never send a customer-funded request to a provider whose
            // *recently verified* wallet cannot pay for this exact bundle.
            // This replaces the old blanket ₦200 routing threshold, which
            // allowed a ₦4,375 plan to be attempted from a nearly empty
            // provider wallet.  Stale balances remain eligible so a recent
            // funding is not accidentally hidden from customers.
            if (hasFreshInsufficientProviderBalance(prov, matchedPlan.apiPrice)) {
                const wallet = prov.apiWallet[0];
                console.warn(`[VendData] Candidate ${prov.name} skipped: verified provider balance ₦${Number(wallet.balance).toFixed(2)} cannot cover ₦${Number(matchedPlan.apiPrice).toFixed(2)} plan (checked ${wallet.lastChecked.toISOString()}).`);
                attemptedErrors.push({ provider: prov.name, message: 'Provider wallet is not funded for this plan' });
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
                const result = await providerAttempts.execute(transaction, prov.id, () => handler.purchaseData(details, config));

                if (result.status === 'success' || result.status === 'pending') {
                    console.log(`[VendData] Successful via ${prov.name}`);
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: {
                            status: 0, // 0 = Success
                            description: `${transaction.description} [SUCCESS via ${prov.name}]`
                        }
                    });
                    return sanitizeVendResult({ ...result, status: 'success' });
                } else {
                    const errMsg = result.message || 'Transaction rejected';
                    console.warn(`[VendData] Provider ${prov.name} returned failed status: ${errMsg}. Attempting fallback...`);
                    attemptedErrors.push({ provider: prov.name, message: errMsg });
                }
            } catch (provErr) {
                return providerAttempts.pending(transaction, 'Data provider outcome could not be finalized.');
            }
        }

        // 5. All candidates failed - execute atomic refund
        const lastErrorSummary = attemptedErrors.length > 0
            ? attemptedErrors.map(e => `${e.provider}: ${e.message}`).join(' | ')
            : 'All providers failed or no matching plans';

        console.error(`[VendData] All candidates exhausted for tx ${transaction.id}: ${lastErrorSummary}`);
        await refundTransaction(transaction, lastErrorSummary);

        // Determine the most descriptive client-facing error message:
        // Prioritize actual provider API responses over fallback eligibility skips.
        const actualApiError = attemptedErrors.find(e => 
            e.message !== 'No matching plan available on provider' && 
            e.message !== 'Provider wallet is not funded for this plan'
        );
        const clientMessage = actualApiError 
            ? actualApiError.message 
            : (attemptedErrors[0]?.message || 'Service Temporarily Unavailable');

        return sanitizeVendResult({ status: 'failed', message: clientMessage });

    } catch (error) {
        console.error('[VendData] System Error:', error);
        return providerAttempts.pending(transaction, 'System Error during data vending');
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
        console.log(`Attempting TV vending via ${service.provider}`);

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

        const result = await providerAttempts.execute(transaction, apiProvider.id, () => handler.purchaseTV(details, config));

        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 0, description: `${transaction.description} [SUCCESS]` } // 0 = Success
            });
        } else if (result.status === 'failed') {
            await refundTransaction(transaction, result.message);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('TV Vending Error:', error);
        return providerAttempts.pending(transaction, 'System Error during TV vending');
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
        console.log(`Attempting electricity vending via ${service.provider}`);

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

        const result = await providerAttempts.execute(transaction, apiProvider.id, () => handler.purchaseElectricity(details, config));

        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 0, description: `${transaction.description} [SUCCESS] Token: ${result.token || 'N/A'}` } // 0 = Success
            });
        } else if (result.status === 'failed') {
            await refundTransaction(transaction, result.message);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('Electricity Vending Error:', error);
        return providerAttempts.pending(transaction, 'System Error during electricity vending');
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

        const result = await providerAttempts.execute(transaction, apiProvider.id, () => handler.purchaseExam(details, config));

        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: result.status === 'pending' ? 1 : 0, // 0 = Success
                    pinContent: result.pin || result.token,
                    description: `${transaction.description} [SUCCESS] PIN: ${result.pin || result.token || 'N/A'}`
                }
            });
        } else if (result.status === 'failed') {
            await refundTransaction(transaction, result.message);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('Exam Vending Error:', error);
        return providerAttempts.pending(transaction, 'System Error during exam vending');
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

        const result = await providerAttempts.execute(transaction, apiProvider.id, () => handler.purchaseDataPin(details, config));

        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: result.status === 'pending' ? 1 : 0, // 0 = Success
                    pinContent: result.pin || result.token,
                    description: `${transaction.description} [SUCCESS] PIN: ${result.pin || result.token || 'N/A'}`
                }
            });
        } else if (result.status === 'failed') {
            await refundTransaction(transaction, result.message);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('Data Pin Vending Error:', error);
        return providerAttempts.pending(transaction, 'System Error during data pin vending');
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

        const result = await providerAttempts.execute(transaction, apiProvider.id, () => handler.purchaseEPin(details, config));

        if (result.status === 'success') {
            const pinContent = result.pins.map(p => `${p.token} (${p.serial})`).join(', ');

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: result.status === 'pending' ? 1 : 0, // 0 = Success
                    pinContent: pinContent,
                    description: `${transaction.description} [SUCCESS] Pins: ${pinContent}`
                }
            });
        } else if (result.status === 'failed') {
            await refundTransaction(transaction, result.message);
        }

        return sanitizeVendResult(result);

    } catch (error) {
        console.error('EPin Vending Error:', error);
        return providerAttempts.pending(transaction, 'System Error during EPin vending');
    }
}

module.exports = { vendAirtime, vendData, vendCable, vendElectricity, vendExam, vendDataPin, vendEPin };
