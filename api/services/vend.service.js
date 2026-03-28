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
        const msgLower = result.message.toLowerCase();
        if (BALANCE_KEYWORDS.some(kw => msgLower.includes(kw))) {
            return { ...result, message: 'Service Temporarily Unavailable' };
        }
    }
    return result;
}


/**
 * Resolve the API provider for a given service, network, and network type.
 * 
 * Hierarchy:
 * 1. ProviderRouting (Network + NetworkType specific)
 * 2. Service directly (service.apiProviderId)
 * 3. ActiveProvider (Generic for the serviceType)
 */
async function resolveProvider(serviceType, network, networkType, service) {
    let apiProviderId = null;

    // 1. Check ProviderRouting for Network + NetworkType override
    if (network && networkType) {
        const routing = await prisma.providerRouting.findFirst({
            where: {
                serviceType,
                network: network.toUpperCase(),
                networkType: { equals: networkType, mode: 'insensitive' },
                active: true
            }
        });
        if (routing) apiProviderId = routing.apiProviderId;
    }

    // 2. Check Service directly
    if (!apiProviderId && service && service.apiProviderId) {
        apiProviderId = service.apiProviderId;
    }

    // 3. Fallback to ActiveProvider
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
 * Vend Airtime
 * @param {Object} transaction - The transaction object
 * @param {Object} service - The service object
 * @param {string} phone - Recipient phone number
 * @param {string} network - Network name (MTN, GLO, etc)
 * @param {string} airtimeType - VTU, Share, etc.
 */
async function vendAirtime(transaction, service, phone, network, airtimeType = 'VTU') {
    try {
        console.log(`Attempting to vend airtime for ${phone} on ${network} using ${service.provider}`);

        // 1. Get Provider Details
        const apiProvider = await resolveProvider('airtime', network, airtimeType, service);

        if (!apiProvider || !apiProvider.name) {
            return { status: 'failed', message: 'No API Provider configured for this service' };
        }

        const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, ''); // normalize 'N3T Data' -> 'n3tdata'
        const handler = findProviderHandler(providerKey);

        if (!handler) {
            return { status: 'failed', message: `Provider handler not found for ${apiProvider.name}` };
        }

        // 2. Prepare Config
        const config = {
            baseUrl: apiProvider.baseUrl,
            apiKey: apiProvider.apiKey,
            secretKey: apiProvider.apiToken,
            username: apiProvider.username || '',
            userUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl : null
        };

        // 3. Prepare Details
        const details = {
            network: network,
            amount: Math.abs(transaction.amount),
            phone: phone,
            requestId: transaction.reference,
            airtimeType: airtimeType,
            // Basic Provider Specifics
            networkId: await getNetworkIdForProvider(providerKey, network)
        };

        // 4. Call Provider
        const result = await handler.purchaseAirtime(details, config);

        // 5. Update Transaction
        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 0, description: `${transaction.description} [SUCCESS]` } // 0 = Success
            });
        } else if (result.status === 'failed') {
            // Refund user
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
        console.error('Vending Error:', error);
        // Process Refund on system error
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
        return { status: 'failed', message: 'System Error during vending' };
    }
}

// Helper to find handler
function findProviderHandler(name) {
    // Check exact match
    if (providers[name]) return providers[name];

    // Check partial (e.g. n3tdata matches n3tdata247)
    const keys = Object.keys(providers);
    for (const key of keys) {
        if (name.includes(key)) return providers[key];
    }
    return null;
}

// Helper to get network ID (mock logic, should be in DB)
async function getNetworkIdForProvider(provider, network) {
    const net = network.toLowerCase();
    // V3 had hardcoded IDs in DB or config. We need a mapping.
    // For now, return a safe default or mapping based on V3 logic.

    if (provider.includes('vtpass')) {
        // Handled inside vtpass.js map
        return null;
    }

    // Basic Providers usually use: 1=MTN, 2=GLO, 3=9MOBILE, 4=AIRTEL (Example)
    const standardMap = { 'mtn': '1', 'glo': '2', '9mobile': '3', 'airtel': '4' };
    return standardMap[net] || '1';
}

/**
 * Vend Data
 * @param {Object} transaction - The transaction object
 * @param {Object} service - The service object
 * @param {string} phone - Recipient phone number
 * @param {string} network - Network name (MTN, GLO, etc)
 */
async function vendData(transaction, service, phone, network) {
    try {
        console.log(`Attempting to vend data for ${phone} on ${network} using ${service.provider}`);

        // Try to identify NetworkType (SME, Gifting, Corporate) from DataPlan based on the service's code (planId)
        let networkType = 'SME'; // Default fallback
        if (service.code) {
            const dataPlan = await prisma.dataPlan.findFirst({
                where: { planId: service.code, network: network }
            });
            if (dataPlan && dataPlan.dataType) {
                networkType = dataPlan.dataType;
            }
        }

        // 1. Get Provider Details
        const apiProvider = await resolveProvider('data', network, networkType, service);

        if (!apiProvider || !apiProvider.name) {
            return { status: 'failed', message: 'No API Provider configured for this data service' };
        }

        const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, '');
        const handler = findProviderHandler(providerKey);

        if (!handler || !handler.purchaseData) {
            return { status: 'failed', message: `Data handler not found for ${apiProvider.name}` };
        }

        // 2. Prepare Config
        const config = {
            baseUrl: apiProvider.baseUrl,
            apiKey: apiProvider.apiKey,
            secretKey: apiProvider.apiToken,
            username: apiProvider.username || '',
            userUrl: apiProvider.baseUrl && apiProvider.baseUrl.includes('api/user') ? apiProvider.baseUrl : null
        };

        // 3. Prepare Details
        // For Maskawa, all services share provider='Maskawasub', so extract the real network from service.name
        // e.g. service.name = 'MTN 1.0GB (SME)' -> network = 'MTN'
        let effectiveNetwork = network;
        if (providerKey === 'maskawasub' && service.name) {
            const nameUpper = service.name.toUpperCase();
            if (nameUpper.startsWith('MTN')) effectiveNetwork = 'MTN';
            else if (nameUpper.startsWith('GLO')) effectiveNetwork = 'GLO';
            else if (nameUpper.startsWith('AIRTEL')) effectiveNetwork = 'AIRTEL';
            else if (nameUpper.startsWith('9MOBILE')) effectiveNetwork = '9MOBILE';
        }

        const details = {
            network: effectiveNetwork,
            phone: phone,
            requestId: transaction.reference,
            planId: service.apiPlanId || service.providerPlanId || service.code, // Handle both common naming conventions (code = Maskawa planId)
            variationCode: service.apiPlanId || service.providerPlanId || service.code, // VTPass uses variation_code
            networkId: await getNetworkIdForProvider(providerKey, effectiveNetwork)
        };

        // 4. Call Provider
        const result = await handler.purchaseData(details, config);

        // 5. Update Transaction
        if (result.status === 'success') {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 0, description: `${transaction.description} [SUCCESS]` } // 0 = Success
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
        console.error('Data Vending Error:', error);
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
 */
async function vendCable(transaction, service, iuc, phone, subscriptionType = 'change') {
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
            variationCode: service.apiPlanId || service.providerPlanId,
            planId: service.apiPlanId || service.providerPlanId,
            number: iuc,
            phone: phone,
            requestId: transaction.reference,
            subscriptionType
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
 * @param {string} meterType - prepaid, postpaid
 */
async function vendElectricity(transaction, service, meterNo, phone, meterType = 'prepaid') {
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
            amount: Math.abs(transaction.amount),
            phone: phone,
            requestId: transaction.reference,
            type: meterType
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
async function vendExam(transaction, service, quantity, phone) {
    try {
        console.log(`Attempting to vend Exam Pin for ${phone} using ${service.provider}`);

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

        const details = {
            serviceID: service.provider.toLowerCase(),
            examId: service.provider.toLowerCase(),
            variationCode: service.apiPlanId || service.providerPlanId,
            quantity: quantity,
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
        console.log(`Attempting to vend Data Pin for ${phone} using ${service.provider}`);

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

module.exports = { vendAirtime, vendData, vendCable, vendElectricity, vendExam, vendDataPin };
