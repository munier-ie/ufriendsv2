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
 * Send alert email
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
 * Main Sync & Route logic
 */
async function runSmartRouting() {
    console.log('[SmartRoutingBot] Starting Smart Routing Sync...');
    try {
        const providers = await prisma.apiProvider.findMany({
            where: { active: true },
            include: { apiWallet: true }
        });

        const allFetchedPlans = [];

        // 1. Fetch Phase
        for (const provider of providers) {
            const providerKey = provider.name.toLowerCase().replace(/\s+/g, '');
            let handler = providerHandlers[providerKey] || providerHandlers['basic'];

            if (handler && typeof handler.fetchDataPlans === 'function') {
                try {
                    const config = {
                        baseUrl: provider.baseUrl,
                        apiKey: provider.apiKey,
                        secretKey: provider.apiToken
                    };
                    const fetched = await handler.fetchDataPlans(config);

                    if (fetched.success && fetched.plans) {
                        fetched.plans.forEach(p => {
                            allFetchedPlans.push({
                                ...p,
                                apiProviderId: provider.id,
                                providerName: provider.name
                            });
                        });
                    }
                } catch (err) {
                    console.error(`[SmartRoutingBot] Failed to fetch plans for ${provider.name}`, err.message);
                }
            }
        }

        if (allFetchedPlans.length === 0) {
            console.log('[SmartRoutingBot] No plans fetched. Aborting sync.');
            return;
        }

        // 2. Discover & Price Protection Phase
        const ourPlans = await prisma.dataPlan.findMany();

        for (const plan of allFetchedPlans) {
            // Find existing plan based on Network + DataName + Type
            const existingPlan = ourPlans.find(p =>
                p.network === plan.network &&
                p.dataName === plan.dataName &&
                p.dataType === plan.dataType
            );

            const basePrice = plan.apiPrice;
            const userPrice = Math.ceil(basePrice * 1.05);
            const agentPrice = Math.ceil(basePrice * 1.03);
            const vendorPrice = Math.ceil(basePrice * 1.01);

            if (!existingPlan) {
                // AUTO-DISCOVERY: We don't have this plan. Insert it.
                console.log(`[SmartRoutingBot] Discovering new plan: ${plan.network} ${plan.dataName} ${plan.dataType}`);

                await prisma.dataPlan.create({
                    data: {
                        network: plan.network,
                        dataName: plan.dataName,
                        dataType: plan.dataType,
                        planId: plan.planId,
                        duration: plan.duration || '30 days',
                        userPrice,
                        agentPrice,
                        vendorPrice,
                        apiPrice: basePrice,
                        apiProviderId: plan.apiProviderId,
                        active: false,
                    }
                });

                // Also create in Service table for frontend visibility once activated
                await prisma.service.create({
                    data: {
                        type: 'data',
                        provider: plan.network,
                        name: `${plan.network} ${plan.dataName} (${plan.dataType})`,
                        code: plan.planId,
                        price: userPrice,
                        agentPrice: agentPrice,
                        vendorPrice: vendorPrice,
                        apiPrice: basePrice,
                        apiProviderId: plan.apiProviderId,
                        active: false
                    }
                });

                await sendAdminAlert(
                    'New Plan Discovered',
                    `A new plan was added: ${plan.network} ${plan.dataName} (${plan.dataType}) via ${plan.providerName}. It is currently inactive awaiting your review.`
                );

            } else {
                // PRICE PROTECTION & SYNC
                // Update local apiPrice if it changed
                if (plan.apiPrice !== existingPlan.apiPrice) {
                    console.log(`[SmartRoutingBot] Price change detected on ${existingPlan.network} ${existingPlan.dataName}: ${existingPlan.apiPrice} -> ${plan.apiPrice}`);

                    // Update DataPlan
                    await prisma.dataPlan.update({
                        where: { id: existingPlan.id },
                        data: {
                            apiPrice: basePrice,
                            userPrice: userPrice,
                            agentPrice: agentPrice,
                            vendorPrice: vendorPrice,
                        }
                    });

                    // Update corresponding Service entries
                    await prisma.service.updateMany({
                        where: {
                            type: 'data',
                            code: existingPlan.planId,
                            apiProviderId: plan.apiProviderId
                        },
                        data: {
                            apiPrice: basePrice,
                            price: userPrice,
                            agentPrice: agentPrice,
                            vendorPrice: vendorPrice,
                        }
                    });

                    if (plan.apiPrice > existingPlan.apiPrice) {
                        await sendAdminAlert(
                            'Prices Auto-Adjusted',
                            `The provider ${plan.providerName} raised the price of ${existingPlan.network} ${existingPlan.dataName} to ${plan.apiPrice}. We increased our selling prices to protect margins.`
                        );
                    }
                }
            }
        }

        // 3. Smart Routing Switch Phase.
        // Group all our active plans by network and type
        const updatedPlans = await prisma.dataPlan.findMany({ where: { active: true } });
        const routingGroups = {};

        updatedPlans.forEach(p => {
            const groupKey = `${p.network}_${p.dataType}`;
            if (!routingGroups[groupKey]) routingGroups[groupKey] = [];
            routingGroups[groupKey].push(p);
        });

        // For each group, we pick the cheapest provider for 1GB (the popular plan, or average)
        for (const groupKey of Object.keys(routingGroups)) {
            const plans = routingGroups[groupKey];
            const network = plans[0].network;
            const networkType = plans[0].dataType;

            // First, find all available apiProviderIds that offer this group
            // We want to rank providers based on their 1GB plan price, or the lowest average.
            // Simplified: we just find the cheapest plan in this category and get its provider.
            let bestPlan = null;
            let currentBestApiPrice = Infinity;

            for (const p of plans) {
                if (p.apiProviderId && p.apiPrice < currentBestApiPrice) {
                    // Check if this provider has money in their wallet
                    const prov = providers.find(prov => prov.id === p.apiProviderId);
                    const wallet = prov?.apiWallets[0];

                    if (wallet && wallet.balance > 500) { // arbitrary threshold, e.g., 500 Naira
                        bestPlan = p;
                        currentBestApiPrice = p.apiPrice;
                    }
                }
            }

            if (bestPlan) {
                // Update ProviderRouting
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
                    `All providers for ${network} ${networkType} appear to have very low wallet balances. Users cannot purchase. Please fund your wallets ASAP.`
                );
            }
        }

        console.log('[SmartRoutingBot] Sync & Routing Complete.');
    } catch (error) {
        console.error('[SmartRoutingBot] Error:', error);
    }
}

/**
 * Start the cron job
 */
function initCron() {
    // Run every hour
    cron.schedule('0 * * * *', () => {
        runSmartRouting();
    });
    console.log('[SmartRoutingBot] Scheduled to run every hour.');
}

module.exports = {
    initCron,
    runSmartRouting
};
