const prisma = require('../../prisma/client');
const vtpass = require('../utils/providers/vtpass');
const basicProvider = require('../utils/providers/basic');
const subandgain = require('../utils/providers/subandgain');
const maskawasub = require('../utils/providers/maskawasub');

const providers = {
    'vtpass': vtpass,
    'n3tdata': basicProvider,
    'n3tdata247': basicProvider,
    'legitdataway': basicProvider,
    'bilalsadasub': basicProvider,
    'subandgain': subandgain,
    'maskawasub': maskawasub
};

function findProviderHandler(name) {
    if (providers[name]) return providers[name];
    const keys = Object.keys(providers);
    for (const key of keys) {
        if (name.includes(key)) return providers[key];
    }
    return null;
}

/**
 * Verify Utility Number (IUC for Cable, Meter for Electricity)
 */
async function verifyUtility(type, providerName, number, meterType = 'prepaid') {
    try {
        // 1. Find the service to know which API provider it uses
        const service = await prisma.service.findFirst({
            where: {
                type: type,
                provider: {
                    contains: providerName.toLowerCase()
                },
                active: true
            }
        });

        let apiProvider;
        if (service && service.apiProviderId) {
            apiProvider = await prisma.apiProvider.findUnique({ where: { id: service.apiProviderId } });
        } else {
            // Fallback to highest priority active provider
            apiProvider = await prisma.apiProvider.findFirst({
                where: { active: true },
                orderBy: { priority: 'asc' }
            });
        }

        if (!apiProvider) {
            return { valid: false, message: 'No API Provider found' };
        }

        const providerKey = apiProvider.name.toLowerCase().replace(/\s+/g, '');
        const handler = findProviderHandler(providerKey);

        if (!handler) {
            return { valid: false, message: `Verification not supported by ${apiProvider.name}` };
        }

        const config = {
            baseUrl: apiProvider.baseUrl,
            apiKey: apiProvider.apiKey,
            secretKey: apiProvider.apiToken,
            username: apiProvider.username || '',
        };

        if (type === 'cable') {
            if (!handler.verifyTV) return { valid: false, message: 'TV Verification not supported by this provider' };
            const details = {
                serviceID: providerName.toLowerCase(),
                cableId: providerName.toLowerCase(),
                number: number
            };
            return await handler.verifyTV(details, config);
        } else if (type === 'electricity') {
            if (!handler.verifyElectricity) return { valid: false, message: 'Electricity Verification not supported by this provider' };
            const details = {
                discoId: providerName.toLowerCase(),
                number: number,
                type: meterType
            };
            return await handler.verifyElectricity(details, config);
        } else {
            return { valid: false, message: 'Invalid verification type' };
        }

    } catch (error) {
        console.error('Utility Verification Error:', error);
        return { valid: false, message: 'System Error during verification' };
    }
}

module.exports = { verifyUtility };
