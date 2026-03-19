const crypto = require('crypto');

/**
 * Generates a 6-character alphanumeric code.
 * Excludes confusing characters like 0, O, I, 1.
 */
function generateShortCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(bytes[i] % chars.length);
    }
    return result;
}

/**
 * Generates a unique code checking against the database.
 */
async function generateUniqueCode(prisma) {
    let code;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
        code = generateShortCode();
        const existing = await prisma.user.findUnique({ where: { referralCode: code } });
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }

    if (!isUnique) {
        // Fallback to a longer code or throw error if somehow we have massive collisions
        return generateShortCode() + Math.floor(Math.random() * 100);
    }

    return code;
}

module.exports = { generateShortCode, generateUniqueCode };
