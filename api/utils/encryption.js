const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

// [SEC-CRIT-03] No fallback — ENCRYPTION_KEY must be explicitly set in .env
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
    throw new Error('FATAL: ENCRYPTION_KEY is not set or is shorter than 32 characters. Set a 32-char random hex key in .env');
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

const IV_LENGTH = 16;

/**
 * Encrypts sensitive data (NIN/BVN)
 * @param {string} text - The text to encrypt
 * @returns {string} - Encrypted text in format: iv:encryptedData
 */
function encrypt(text) {
    if (!text) return null;

    // Ensure key is 32 characters
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts sensitive data (NIN/BVN)
 * @param {string} text - The encrypted text in format: iv:encryptedData
 * @returns {string} - Decrypted text
 */
function decrypt(text) {
    if (!text) return null;

    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}

/**
 * Hashes data for comparison (used for passwords, PINs)
 * @param {string} data - Data to hash
 * @returns {string} - Hashed data
 */
function hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
    encrypt,
    decrypt,
    hash
};
