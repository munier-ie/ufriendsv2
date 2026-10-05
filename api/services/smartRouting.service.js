const cron = require('node-cron');
const prisma = require('../../prisma/client');
const emailService = require('./email.service');
const axios = require('axios');

// Rate-limit map: subject → timestamp of last sent email
const _alertCooldowns = new Map();
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per subject

/**
 * Send alert email to admin (rate-limited per subject).
 * The same subject will only be emailed once per ALERT_COOLDOWN_MS window.
 */
async function sendAdminAlert(subject, message) {
    const now = Date.now();
    const lastSent = _alertCooldowns.get(subject);
    if (lastSent && (now - lastSent) < ALERT_COOLDOWN_MS) {
        console.log(`[SmartRoutingBot] ALERT SUPPRESSED (cooldown): ${subject}`);
        return;
    }
    console.log(`[SmartRoutingBot] ALERT: ${subject} - ${message}`);
    try {
        await emailService.sendAdminAlert(subject, message);
        _alertCooldowns.set(subject, now);
    } catch (error) {
        console.error('[SmartRoutingBot] Email Alert failed:', error.message);
    }
}

const providerHandlers = {
    'alrahuz': require('../utils/providers/alrahuz'),
    'alrahuzdata': require('../utils/providers/alrahuz'), // Alias for Alrahuz Data
    'maskawa': require('../utils/providers/maskawasub'), // Alias for Maskawa
    'maskawasub': require('../utils/providers/maskawasub'),
    'subandgain': require('../utils/providers/subandgain'),
    'vtpass': require('../utils/providers/vtpass'),
    'basic': require('../utils/providers/basic')
};

/**
 * Get the handler and config for a provider DB record.
 * Provider name in DB (e.g. "Maskawa Sub", "Alrahuz") is normalized to match keys in providerHandlers.
 */
function getHandlerAndConfig(provider) {
    const providerKey = provider.name.toLowerCase().replace(/\s+/g, '');
    const handler = providerHandlers[providerKey] || providerHandlers['basic'];
    const config = {
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        secretKey: provider.apiToken,
        username: provider.username  // Subandgain uses username + apiKey
    };
    return { handler, config };
}

/**
 * Apply markup tiers to a base API price.
 */
function calcPrices(basePrice) {
    return {
        apiPrice: basePrice,
        userPrice: Math.ceil(basePrice * 1.05),
        agentPrice: Math.ceil(basePrice * 1.03),
        vendorPrice: Math.ceil(basePrice * 1.01)
    };
}

/**
 * Extract size in megabytes from plan name (e.g. '1.0GB' -> 1024, '500MB' -> 500)
 */
function extractMegabytes(name) {
    if (!name) return 0;
    const match = name.toUpperCase().match(/([\d.]+)\s*(MB|GB|TB)/);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    if (unit === 'MB') return value;
    if (unit === 'GB') return value * 1024;
    if (unit === 'TB') return value * 1024 * 1024;
    return 0;
}

// =============================================================================
//  PHASE 1: DATA PLANS — Fetch, Discover & Price-Protect
//  Match is now performed on planId + apiProviderId (NOT plan name).
// =============================================================================
async function syncDataPlans(providers) {
    console.log('[SmartRoutingBot] --- Phase 1: Data Plans ---');
    const allFetched = [];

    for (const provider of providers) {
        const { handler, config } = getHandlerAndConfig(provider);
        if (!handler || typeof handler.fetchDataPlans !== 'function') continue;

        try {
            const result = await handler.fetchDataPlans(config);
            if (result.success && result.plans) {
                result.plans.forEach(p => allFetched.push({
                    ...p,
                    apiProviderId: provider.id,
                    providerName: provider.name
                }));
                console.log(`[SmartRoutingBot] Data: fetched ${result.plans.length} plans from ${provider.name}`);
            } else {
                console.warn(`[SmartRoutingBot] Data fetch skipped for ${provider.name}: ${result.message}`);
            }
        } catch (err) {
            console.error(`[SmartRoutingBot] Data fetch failed for ${provider.name}:`, err.message);
        }
    }

    if (allFetched.length === 0) {
        console.log('[SmartRoutingBot] No data plans fetched. Skipping data sync.');
        return;
    }

    // Load ALL existing data plans from DB once
    const ourPlans = await prisma.dataPlan.findMany();

    for (const plan of allFetched) {
        if (plan.apiPrice == null || isNaN(plan.apiPrice)) {
            console.warn(`[SmartRoutingBot] Skipping plan with invalid price: ${plan.network} ${plan.dataName} [ID: ${plan.planId}] via ${plan.providerName}`);
            continue;
        }

        // Filter out massive plans (>10GB) to prevent sync/buy overload
        const mbSize = extractMegabytes(plan.dataName);
        if (mbSize > 10240) {
            console.warn(`[SmartRoutingBot] Skipping large plan (>10GB): ${plan.network} ${plan.dataName}`);
            continue;
        }

        const prices = calcPrices(plan.apiPrice);

        // ✅ Match by planId + apiProviderId — NOT by name
        const existingPlan = ourPlans.find(p =>
            p.planId === plan.planId &&
            p.apiProviderId === plan.apiProviderId
        );

        if (!existingPlan) {
            // NEW PLAN: insert inactive for admin review
            console.log(`[SmartRoutingBot] New data plan discovered: ${plan.network} ${plan.dataName} (${plan.dataType}) [${plan.planId}] via ${plan.providerName}`);

            await prisma.dataPlan.create({
                data: {
                    network: plan.network,
                    dataName: plan.dataName,
                    dataType: plan.dataType,
                    planId: plan.planId,
                    duration: plan.duration || '30 days',
                    userPrice: prices.userPrice,
                    agentPrice: prices.agentPrice,
                    vendorPrice: prices.vendorPrice,
                    apiPrice: prices.apiPrice,
                    apiProviderId: plan.apiProviderId,
                    active: false
                }
            });

            await prisma.service.create({
                data: {
                    type: 'data',
                    provider: plan.network,
                    name: `${plan.network} ${plan.dataName} (${plan.dataType})`,
                    code: plan.planId,
                    price: prices.userPrice,
                    agentPrice: prices.agentPrice,
                    vendorPrice: prices.vendorPrice,
                    apiPrice: prices.apiPrice,
                    apiProviderId: plan.apiProviderId,
                    active: false
                }
            });

            await sendAdminAlert(
                'New Data Plan Discovered',
                `New plan found: ${plan.network} ${plan.dataName} (${plan.dataType}) [ID: ${plan.planId}] via ${plan.providerName}. Awaiting your review.`
            );

        } else if (plan.apiPrice !== existingPlan.apiPrice) {
            // PRICE CHANGE: auto-update all tiers
            const direction = plan.apiPrice > existingPlan.apiPrice ? 'raised' : 'lowered';
            console.log(`[SmartRoutingBot] Price ${direction}: ${existingPlan.network} ${existingPlan.dataName} [ID: ${existingPlan.planId}] ${existingPlan.apiPrice} → ${plan.apiPrice}`);

            await prisma.dataPlan.update({
                where: { id: existingPlan.id },
                data: {
                    apiPrice: prices.apiPrice,
                    userPrice: prices.userPrice,
                    agentPrice: prices.agentPrice,
                    vendorPrice: prices.vendorPrice
                }
            });

            // Update matching Service entry by planId + apiProviderId
            await prisma.service.updateMany({
                where: {
                    type: 'data',
                    code: existingPlan.planId,
                    apiProviderId: plan.apiProviderId
                },
                data: {
                    apiPrice: prices.apiPrice,
                    price: prices.userPrice,
                    agentPrice: prices.agentPrice,
                    vendorPrice: prices.vendorPrice
                }
            });

            if (direction === 'raised') {
                await sendAdminAlert(
                    'Data Prices Auto-Adjusted (Increase)',
                    `${plan.providerName} raised price of ${existingPlan.network} ${existingPlan.dataName} [ID: ${existingPlan.planId}] from ₦${existingPlan.apiPrice} → ₦${plan.apiPrice}. Selling prices updated automatically.`
                );
            }
        }
    }
}

// =============================================================================
//  PHASE 2: CABLE TV PLANS — Fetch, Discover & Price-Protect
//  Match is performed on code (bills_code / cableplan_id) + apiProviderId.
// =============================================================================
async function syncCablePlans(providers) {
    console.log('[SmartRoutingBot] --- Phase 2: Cable TV Plans ---');
    const allFetched = [];

    for (const provider of providers) {
        const { handler, config } = getHandlerAndConfig(provider);
        if (!handler || typeof handler.fetchCablePlans !== 'function') continue;

        try {
            const result = await handler.fetchCablePlans(config);
            if (result.success && result.plans) {
                result.plans.forEach(p => allFetched.push({
                    ...p,
                    apiProviderId: provider.id,
                    providerName: provider.name
                }));
                console.log(`[SmartRoutingBot] Cable: fetched ${result.plans.length} plans from ${provider.name}`);
            } else {
                console.warn(`[SmartRoutingBot] Cable fetch skipped for ${provider.name}: ${result.message}`);
            }
        } catch (err) {
            console.error(`[SmartRoutingBot] Cable fetch failed for ${provider.name}:`, err.message);
        }
    }

    if (allFetched.length === 0) {
        console.log('[SmartRoutingBot] No cable plans fetched. Skipping cable sync.');
        return;
    }

    // Load all existing cable service records once
    const ourCable = await prisma.service.findMany({ where: { type: 'cable' } });

    for (const plan of allFetched) {
        if (plan.apiPrice == null || isNaN(plan.apiPrice)) {
            console.warn(`[SmartRoutingBot] Skipping cable plan with invalid price: ${plan.provider} - ${plan.name} [${plan.code}] via ${plan.providerName}`);
            continue;
        }
        const prices = calcPrices(plan.apiPrice);

        // ✅ Match by type=cable + code + apiProviderId
        const existing = ourCable.find(s =>
            s.code === plan.code &&
            s.apiProviderId === plan.apiProviderId
        );

        if (!existing) {
            // NEW CABLE PLAN: insert inactive for admin review
            console.log(`[SmartRoutingBot] New cable plan discovered: ${plan.provider} - ${plan.name} [${plan.code}] via ${plan.providerName}`);

            await prisma.service.create({
                data: {
                    type: 'cable',
                    provider: plan.provider,   // 'dstv' | 'gotv' | 'startimes'
                    name: plan.name,
                    code: plan.code,
                    price: prices.userPrice,
                    agentPrice: prices.agentPrice,
                    vendorPrice: prices.vendorPrice,
                    apiPrice: prices.apiPrice,
                    apiProviderId: plan.apiProviderId,
                    active: false
                }
            });

            await sendAdminAlert(
                'New Cable TV Plan Discovered',
                `New cable plan: ${plan.provider.toUpperCase()} - ${plan.name} [Code: ${plan.code}] via ${plan.providerName}. Awaiting your review.`
            );

        } else if (plan.apiPrice !== existing.apiPrice) {
            // PRICE CHANGE
            const direction = plan.apiPrice > existing.apiPrice ? 'raised' : 'lowered';
            console.log(`[SmartRoutingBot] Cable price ${direction}: ${existing.provider} ${existing.name} [${existing.code}] ${existing.apiPrice} → ${plan.apiPrice}`);

            await prisma.service.update({
                where: { id: existing.id },
                data: {
                    apiPrice: prices.apiPrice,
                    price: prices.userPrice,
                    agentPrice: prices.agentPrice,
                    vendorPrice: prices.vendorPrice
                }
            });

            if (direction === 'raised') {
                await sendAdminAlert(
                    'Cable TV Prices Auto-Adjusted (Increase)',
                    `${plan.providerName} raised price of ${existing.provider.toUpperCase()} - ${existing.name} [${existing.code}] from ₦${existing.apiPrice} → ₦${plan.apiPrice}. Selling prices updated.`
                );
            }
        }
    }
}

// =============================================================================
//  PHASE 3: EXAM PINS — Fetch, Discover & Price-Protect
//  Match is performed on code (eduType) + apiProviderId.
// =============================================================================
async function syncExamPlans(providers) {
    console.log('[SmartRoutingBot] --- Phase 3: Exam Pins ---');
    const allFetched = [];

    for (const provider of providers) {
        const { handler, config } = getHandlerAndConfig(provider);
        if (!handler || typeof handler.fetchExamPlans !== 'function') continue;

        try {
            const result = await handler.fetchExamPlans(config);
            if (result.success && result.plans) {
                result.plans.forEach(p => allFetched.push({
                    ...p,
                    apiProviderId: provider.id,
                    providerName: provider.name
                }));
                console.log(`[SmartRoutingBot] Exam: fetched ${result.plans.length} plans from ${provider.name}`);
            } else {
                console.warn(`[SmartRoutingBot] Exam fetch skipped for ${provider.name}: ${result.message}`);
            }
        } catch (err) {
            console.error(`[SmartRoutingBot] Exam fetch failed for ${provider.name}:`, err.message);
        }
    }

    if (allFetched.length === 0) {
        console.log('[SmartRoutingBot] No exam plans fetched. Skipping exam sync.');
        return;
    }

    // Load all existing exam service records once
    const ourExam = await prisma.service.findMany({ where: { type: 'exam' } });

    for (const plan of allFetched) {
        if (plan.apiPrice == null || isNaN(plan.apiPrice)) {
            console.warn(`[SmartRoutingBot] Skipping exam plan with invalid price: ${plan.examType} - ${plan.name} [${plan.code}] via ${plan.providerName}`);
            continue;
        }
        const prices = calcPrices(plan.apiPrice);

        // ✅ Match by type=exam + code + apiProviderId
        const existing = ourExam.find(s =>
            s.code === plan.code &&
            s.apiProviderId === plan.apiProviderId
        );

        if (!existing) {
            // NEW EXAM PLAN: insert inactive for admin review
            console.log(`[SmartRoutingBot] New exam plan discovered: ${plan.examType} - ${plan.name} [${plan.code}] via ${plan.providerName}`);

            await prisma.service.create({
                data: {
                    type: 'exam',
                    provider: plan.examType,   // 'NECO' | 'WAEC' | etc.
                    name: plan.name,
                    code: plan.code,
                    price: prices.userPrice,
                    agentPrice: prices.agentPrice,
                    vendorPrice: prices.vendorPrice,
                    apiPrice: prices.apiPrice,
                    apiProviderId: plan.apiProviderId,
                    active: false
                }
            });

            await sendAdminAlert(
                'New Exam Pin Plan Discovered',
                `New exam plan: ${plan.examType} - ${plan.name} [Code: ${plan.code}] via ${plan.providerName}. Awaiting your review.`
            );

        } else if (plan.apiPrice !== existing.apiPrice) {
            // PRICE CHANGE
            const direction = plan.apiPrice > existing.apiPrice ? 'raised' : 'lowered';
            console.log(`[SmartRoutingBot] Exam price ${direction}: ${existing.provider} ${existing.name} [${existing.code}] ${existing.apiPrice} → ${plan.apiPrice}`);

            await prisma.service.update({
                where: { id: existing.id },
                data: {
                    apiPrice: prices.apiPrice,
                    price: prices.userPrice,
                    agentPrice: prices.agentPrice,
                    vendorPrice: prices.vendorPrice
                }
            });

            if (direction === 'raised') {
                await sendAdminAlert(
                    'Exam Pin Prices Auto-Adjusted (Increase)',
                    `${plan.providerName} raised price of ${existing.provider} - ${existing.name} [${existing.code}] from ₦${existing.apiPrice} → ₦${plan.apiPrice}.`
                );
            }
        }
    }
}

// =============================================================================
//  PHASE 4: SMART ROUTING SWITCH — For data plans, switch to cheapest provider
// =============================================================================
async function runSmartRoutingSwitch(providers) {
    console.log('[SmartRoutingBot] --- Phase 4: Smart Routing Switch ---');
    const unfundedGroups = []; // Collect unfunded groups to send ONE consolidated alert

    // Reload active providers to ensure we evaluate the newly live-synced wallet balances
    const freshProviders = await prisma.apiProvider.findMany({
        where: { active: true },
        include: { apiWallet: true }
    });
    const currentProviders = freshProviders.length > 0 ? freshProviders : providers;

    const updatedPlans = await prisma.dataPlan.findMany({ where: { active: true } });
    const routingGroups = new Map();

    updatedPlans.forEach(p => {
        const groupKey = `${p.network}_${p.dataType}`;
        if (!routingGroups.has(groupKey)) routingGroups.set(groupKey, []);
        routingGroups.get(groupKey).push(p);
    });

    for (const [groupKey, plans] of routingGroups.entries()) {
        const network = plans[0].network;
        const networkType = plans[0].dataType;

        // Group plans by provider to evaluate overall provider price competitiveness for this network & dataType
        const providerScores = new Map();

        for (const p of plans) {
            if (!p.apiProviderId || !p.apiPrice || p.apiPrice <= 0) continue;
            const prov = currentProviders.find(pr => pr.id === p.apiProviderId);
            const wallet = prov?.apiWallet?.[0];
            // Minimum balance threshold: at least ₦200 to route to this provider
            if (wallet && wallet.balance < 200) continue;

            const sizeMb = extractMegabytes(p.dataName) || 1024;
            const pricePerGb = (p.apiPrice / sizeMb) * 1024;

            if (!providerScores.has(p.apiProviderId)) {
                providerScores.set(p.apiProviderId, {
                    providerId: p.apiProviderId,
                    totalPricePerGb: pricePerGb,
                    planCount: 1,
                    hasOneGb: /1\.?0?GB/i.test(p.dataName),
                    oneGbPrice: /1\.?0?GB/i.test(p.dataName) ? p.apiPrice : null,
                    samplePlan: p
                });
            } else {
                const cur = providerScores.get(p.apiProviderId);
                cur.totalPricePerGb += pricePerGb;
                cur.planCount += 1;
                if (/1\.?0?GB/i.test(p.dataName)) {
                    cur.hasOneGb = true;
                    cur.oneGbPrice = p.apiPrice;
                }
            }
        }

        let bestPlan = null;
        let lowestBenchmarkPrice = Infinity;

        for (const score of providerScores.values()) {
            // Prioritize 1GB plan price if available, otherwise average price per GB
            const benchmark = score.oneGbPrice || (score.totalPricePerGb / score.planCount);
            if (benchmark < lowestBenchmarkPrice) {
                lowestBenchmarkPrice = benchmark;
                bestPlan = score.samplePlan;
            }
        }

        if (bestPlan) {
            const existingRoute = await prisma.providerRouting.findUnique({
                where: {
                    serviceType_network_networkType: {
                        serviceType: 'data',
                        network: network,
                        networkType: networkType
                    }
                }
            });

            if (existingRoute && existingRoute.apiProviderId !== bestPlan.apiProviderId) {
                await prisma.providerRouting.update({
                    where: { id: existingRoute.id },
                    data: { apiProviderId: bestPlan.apiProviderId }
                });
                console.log(`[SmartRoutingBot] Switched ${network} ${networkType} to provider ID ${bestPlan.apiProviderId}`);
            } else if (!existingRoute) {
                await prisma.providerRouting.create({
                    data: {
                        serviceType: 'data',
                        network: network,
                        networkType: networkType,
                        apiProviderId: bestPlan.apiProviderId,
                        active: true
                    }
                });
            }
        } else {
            console.log(`[SmartRoutingBot] No valid/funded provider found for ${network} ${networkType}`);
            unfundedGroups.push(`${network} ${networkType}`);
        }
    }

    // Send ONE consolidated alert for all unfunded network/dataType groups
    if (unfundedGroups.length > 0) {
        const listing = unfundedGroups.map(g => `  • ${g}`).join('\n');
        await sendAdminAlert(
            'CRITICAL: No Funded Provider',
            `The following ${unfundedGroups.length} network/type group(s) have NO funded provider (all wallets below ₦200):\n\n${listing}\n\nUsers cannot purchase data for these groups. Please fund your provider wallets ASAP.`
        );
    }
}

/**
 * Live-sync provider balances from their respective APIs into apiWallet table
 */
async function syncProviderBalances(providers) {
    console.log('[SmartRoutingBot] Live-syncing provider wallet balances...');
    for (const provider of providers) {
        const { handler, config } = getHandlerAndConfig(provider);
        if (handler && typeof handler.checkBalance === 'function') {
            try {
                const balRes = await handler.checkBalance(config);
                if (balRes && balRes.success && typeof balRes.balance === 'number') {
                    const balance = balRes.balance;
                    const existing = await prisma.apiWallet.findFirst({ where: { apiProviderId: provider.id } });
                    if (existing) {
                        await prisma.apiWallet.update({
                            where: { id: existing.id },
                            data: { balance, lastChecked: new Date() }
                        });
                    } else {
                        await prisma.apiWallet.create({
                            data: { apiProviderId: provider.id, balance, lastChecked: new Date() }
                        });
                    }
                    provider.apiWallet = [{ balance, lastChecked: new Date() }];
                    console.log(`[SmartRoutingBot] Live balance for ${provider.name}: ₦${balance.toFixed(2)}`);
                }
            } catch (err) {
                console.warn(`[SmartRoutingBot] Balance sync failed for ${provider.name}:`, err.message);
            }
        }
    }
}

// =============================================================================
//  MAIN ENTRY POINT
// =============================================================================
async function runSmartRouting() {
    console.log('[SmartRoutingBot] Starting Smart Routing Sync...');
    try {
        const providers = await prisma.apiProvider.findMany({
            where: { active: true },
            include: { apiWallet: true }
        });

        if (providers.length === 0) {
            console.log('[SmartRoutingBot] No active providers found. Aborting.');
            return;
        }

        console.log(`[SmartRoutingBot] Found ${providers.length} active provider(s): ${providers.map(p => p.name).join(', ')}`);

        // 0. Live-sync real-time wallet balances so smart routing never acts on stale 0 balance
        await syncProviderBalances(providers);

        // Run all sync phases
        await syncDataPlans(providers);
        await syncCablePlans(providers);
        await syncExamPlans(providers);
        await runSmartRoutingSwitch(providers);

        console.log('[SmartRoutingBot] Sync & Routing Complete.');
    } catch (error) {
        console.error('[SmartRoutingBot] Error:', error);
        await sendAdminAlert('SmartRoutingBot Error', error.message);
    }
}

// ===========================================================================
//  DYNAMIC CRON SCHEDULER
// ===========================================================================
let currentCronTask = null;
let currentCronConfig = {
    expression: '0 * * * *',
    mode: 'hourly',
    label: 'Every hour'
};

/**
 * Build a human-readable label from a cron expression and mode
 */
function buildLabel(mode, value, hour, expression) {
    switch (mode) {
        case 'hourly': return 'Every hour';
        case 'every_n_hours': return `Every ${value} hour(s)`;
        case 'daily': return `Once daily at ${hour ?? 0}:00`;
        case 'custom': return `Custom: ${expression}`;
        default: return expression;
    }
}

/**
 * Get the current cron configuration
 */
function getCronConfig() {
    return { ...currentCronConfig };
}

/**
 * Update the cron schedule at runtime (no server restart required)
 * @param {string} expression - Valid cron expression
 * @param {object} meta - { mode, value, hour, customCron }
 */
function updateCronSchedule(expression, meta = {}) {
    try {
        // Validate by attempting to create (will throw if invalid)
        const task = cron.schedule(expression, () => {}, { scheduled: false });
        task.stop();

        // Stop old task
        if (currentCronTask) {
            currentCronTask.stop();
            currentCronTask = null;
        }

        // Start new task
        currentCronTask = cron.schedule(expression, () => {
            runSmartRouting();
        });

        currentCronConfig = {
            expression,
            mode: meta.mode || 'custom',
            label: buildLabel(meta.mode, meta.value, meta.hour, expression)
        };

        console.log(`[SmartRoutingBot] Schedule updated: ${expression} (${currentCronConfig.label})`);
        return { success: true };
    } catch (err) {
        console.error('[SmartRoutingBot] Invalid cron expression:', err.message);
        return { success: false, error: 'Invalid cron expression: ' + err.message };
    }
}

/**
 * Start the cron job with the default schedule (every hour)
 */
function initCron() {
    updateCronSchedule('0 * * * *', { mode: 'hourly' });
    console.log('[SmartRoutingBot] Scheduled to run every hour.');
}

module.exports = {
    initCron,
    runSmartRouting,
    updateCronSchedule,
    getCronConfig
};
