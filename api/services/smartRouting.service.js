const cron = require('node-cron');
const prisma = require('../../prisma/client');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Configure email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Import provider handlers
const providerHandlers = {
    'alrahuz': require('../utils/providers/alrahuz'),
    'maskawasub': require('../utils/providers/maskawasub'),
    'subandgain': require('../utils/providers/subandgain'),
    'vtpass': require('../utils/providers/vtpass'),
    'basic': require('../utils/providers/basic')
};

/**
 * Send alert email to admin
 */
async function sendAdminAlert(subject, message) {
    console.log(`[SmartRoutingBot] ALERT: ${subject} - ${message}`);
    try {
        if (!process.env.ADMIN_EMAIL || !process.env.SMTP_USER) return;
        await transporter.sendMail({
            from: `"Ufriends Router Bot" <${process.env.SMTP_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: subject,
            text: message
        });
    } catch (error) {
        console.error('[SmartRoutingBot] Email Alert failed:', error.message);
    }
}

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

    const updatedPlans = await prisma.dataPlan.findMany({ where: { active: true } });
    const routingGroups = {};

    updatedPlans.forEach(p => {
        const groupKey = `${p.network}_${p.dataType}`;
        if (!routingGroups[groupKey]) routingGroups[groupKey] = [];
        routingGroups[groupKey].push(p);
    });

    for (const groupKey of Object.keys(routingGroups)) {
        const plans = routingGroups[groupKey];
        const network = plans[0].network;
        const networkType = plans[0].dataType;

        let bestPlan = null;
        let currentBestApiPrice = Infinity;

        for (const p of plans) {
            if (p.apiProviderId && p.apiPrice < currentBestApiPrice) {
                const prov = providers.find(pr => pr.id === p.apiProviderId);
                const wallet = prov?.apiWallet?.[0];
                if (wallet && wallet.balance > 500) {
                    bestPlan = p;
                    currentBestApiPrice = p.apiPrice;
                }
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
            await sendAdminAlert(
                'CRITICAL: No Funded Provider',
                `All providers for ${network} ${networkType} have very low wallet balances. Users cannot purchase. Please fund your wallets ASAP.`
            );
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
