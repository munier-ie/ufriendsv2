const prisma = require('../../prisma/client');

/**
 * Credits a referral bonus to the referrer of a user.
 * @param {number} userId - The ID of the user performing the action (the referee)
 * @param {string} serviceType - The type of service triggering the bonus (e.g., 'upgrade', 'airtime')
 * @param {number} customCommission - Optional custom commission amount from service settings
 */
async function creditReferralBonus(userId, serviceType, customCommission = null) {
    try {
        // 1. Get the user and their referrer using the relationship
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                referrer: true // Use the relationship defined in schema
            }
        });

        if (!user || !user.referrer) {
            // Fallback: If relationship isn't set but user.referral (code/phone) exists
            if (user && user.referral) {
                const legacyReferrer = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { phone: user.referral },
                            { referralCode: user.referral }
                        ]
                    }
                });

                if (legacyReferrer) {
                    await performCredit(user, legacyReferrer, serviceType, customCommission);
                }
            }
            return;
        }

        await performCredit(user, user.referrer, serviceType, customCommission);

    } catch (error) {
        console.error('Error crediting referral bonus:', error);
    }
}

/**
 * Internal helper to handle the actual wallet update and transaction record
 */
async function performCredit(user, referrer, serviceType, customCommission) {
    // Determine Bonus Amount
    let bonusAmount = 0;

    if (customCommission !== null && customCommission !== undefined) {
        bonusAmount = parseFloat(customCommission);
    } else {
        // Fallback to database settings
        const settingsService = require('./settings.service');
        const defaultBonus = await settingsService.getSetting('referralBonus', 0);

        switch (serviceType) {
            case 'upgrade':
                bonusAmount = defaultBonus;
                break;
            case 'airtime':
                bonusAmount = parseFloat(process.env.REFERRAL_BONUS_AIRTIME || 0);
                break;
            case 'data':
                bonusAmount = parseFloat(process.env.REFERRAL_BONUS_DATA || 0);
                break;
            case 'cable':
                bonusAmount = parseFloat(process.env.REFERRAL_BONUS_CABLE || 0);
                break;
            case 'electricity':
                bonusAmount = parseFloat(process.env.REFERRAL_BONUS_ELECTRICITY || 0);
                break;
            case 'exam':
                bonusAmount = parseFloat(process.env.REFERRAL_BONUS_EXAM || 0);
                break;
            default:
                bonusAmount = 0;
        }
    }

    if (bonusAmount <= 0) return;

    const newRefBalance = referrer.refWallet + bonusAmount;

    await prisma.$transaction([
        prisma.user.update({
            where: { id: referrer.id },
            data: { refWallet: { increment: bonusAmount } }
        }),
        prisma.transaction.create({
            data: {
                reference: `REF_BONUS_${Date.now()}_${referrer.id}`,
                serviceName: 'Referral Bonus',
                description: `Bonus for ${user.firstName || 'User'}'s ${serviceType} transaction`,
                amount: bonusAmount,
                status: 0, // Success
                oldBalance: referrer.refWallet,
                newBalance: newRefBalance,
                type: 'referral',
                userId: referrer.id
            }
        })
    ]);

    console.log(`Referral bonus of N${bonusAmount} credited to user ID ${referrer.id} for ${serviceType}`);
}

module.exports = { creditReferralBonus };
