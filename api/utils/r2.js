/**
 * Cloudflare R2 Storage Utility
 * 
 * S3-compatible object storage for NIN/BVN slip PDFs.
 * Primary access: streamed through our authenticated API with strict anti-caching headers.
 */
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const R2_ACCOUNT_ID   = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET       = process.env.R2_BUCKET_NAME || 'ufriends-slips';

// Lazy-init so the app doesn't crash if env vars are missing during import
let _client = null;
function getClient() {
    if (_client) return _client;
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
        throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
    }
    _client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY,
            secretAccessKey: R2_SECRET_KEY,
        },
    });
    return _client;
}

/**
 * Upload a PDF buffer to R2.
 * @param {Buffer} buffer   – The PDF file buffer
 * @param {string} key      – R2 object key, e.g. "slips/nin/standard/uuid.pdf"
 * @returns {Promise<string>} The object key stored in R2
 */
async function uploadSlip(buffer, key) {
    const client = getClient();
    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        ContentDisposition: 'inline',
    }));
    return key;
}

/**
 * Fetch a slip from R2 and return a readable stream + metadata.
 * The stream is piped through our auth'd API endpoint — no public URL exposure.
 * @param {string} key – R2 object key
 * @returns {Promise<{ stream: ReadableStream, contentLength: number, contentType: string }>}
 */
async function getSlipStream(key) {
    const client = getClient();
    const response = await client.send(new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    }));
    return {
        stream: response.Body,
        contentLength: response.ContentLength,
        contentType: response.ContentType || 'application/pdf',
    };
}

/**
 * Generate a short-lived presigned URL (fallback / external webhook use only).
 * @param {string} key - R2 object key
 * @param {number} expiresIn - URL lifespan in seconds (default 600 = 10 min)
 * @returns {Promise<string>}
 */
async function getPresignedUrl(key, expiresIn = 600) {
    const client = getClient();
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    });
    return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a slip from R2 (for cleanup/admin use).
 * @param {string} key – R2 object key
 */
async function deleteSlip(key) {
    const client = getClient();
    await client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    }));
}

/**
 * Check if R2 is properly configured.
 * @returns {boolean}
 */
function isR2Configured() {
    return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY);
}

module.exports = {
    uploadSlip,
    getSlipStream,
    getPresignedUrl,
    deleteSlip,
    isR2Configured,
};
