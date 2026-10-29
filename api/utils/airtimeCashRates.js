const DEFAULT_AIRTIME_CASH_RATES = [
    { network: 'MTN', rate: 85 },
    { network: 'GLO', rate: 75 },
    { network: 'AIRTEL', rate: 80 },
    { network: '9MOBILE', rate: 80 }
];

function normalizeAirtimeNetwork(network) {
    const normalized = String(network || '').trim().toUpperCase();
    return normalized === 'ETISALAT' ? '9MOBILE' : normalized;
}

async function ensureAirtimeCashRates(prisma) {
    await Promise.all(DEFAULT_AIRTIME_CASH_RATES.map((defaultRate) => prisma.airtimeToCashRate.upsert({
        where: { network: defaultRate.network },
        update: {},
        create: {
            ...defaultRate,
            active: true,
            phoneNumber: ''
        }
    })));
}

module.exports = {
    DEFAULT_AIRTIME_CASH_RATES,
    normalizeAirtimeNetwork,
    ensureAirtimeCashRates
};
