const crypto = require('node:crypto');
const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');

const keySecret = process.env.RATE_LIMIT_KEY_SECRET || process.env.JWT_SECRET;
if (!keySecret && process.env.NODE_ENV === 'production') {
    throw new Error('RATE_LIMIT_KEY_SECRET or JWT_SECRET is required in production');
}

const limiterSecret = keySecret || crypto.randomBytes(32).toString('hex');
const useMemoryOnly = process.env.RATE_LIMIT_STORE === 'memory';

let redisClient = null;
if (!useMemoryOnly) {
    ({ redisClient } = require('../utils/redis'));
}

function positiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function hashKey(value) {
    return crypto.createHmac('sha256', limiterSecret).update(String(value)).digest('hex');
}

function normalizeIp(value) {
    const ip = String(value || 'unknown').trim();
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function getClientIp(req) {
    // req.ip is safe only because app.js configures Express trust proxy from an
    // explicit allow-list. Never read X-Forwarded-For directly here.
    return normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown');
}

function getDeviceId(req) {
    const value = req.get ? req.get('x-device-id') : req.headers?.['x-device-id'];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    // Installation IDs are opaque. Reject oversized/unusual input before it
    // reaches logs or the backing store.
    return /^[A-Za-z0-9._:-]{16,128}$/.test(trimmed) ? trimmed : null;
}

function makeStore(name, options) {
    const memory = new RateLimiterMemory({
        keyPrefix: `rl_mem_${name}`,
        ...options,
    });

    if (useMemoryOnly || !redisClient) return memory;

    return new RateLimiterRedis({
        storeClient: redisClient,
        useRedisPackage: false,
        rejectIfRedisNotReady: true,
        keyPrefix: `rl_${name}`,
        insuranceLimiter: memory,
        ...options,
    });
}

function retrySeconds(result) {
    return Math.max(1, Math.ceil((result?.reason?.msBeforeNext || 1000) / 1000));
}

function parseBackoffSteps(value, fallback) {
    if (!value) return fallback;
    const steps = String(value)
        .split(',')
        .map(item => positiveInteger(item.trim(), 0))
        .filter(Boolean);
    return steps.length > 0 ? steps : fallback;
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/**
 * Credential failures need different semantics from request-volume limiting:
 * only a rejected credential consumes a point, the third failure locks, and
 * each subsequent failure increases the wait. The state is shared in Redis so
 * opening another browser/incognito window does not reset it.
 */
function createCredentialFailureGuard({
    name,
    accountKey,
    requestProperty = 'credentialRateLimit',
    failureThreshold = 3,
    backoffSteps = [60, 5 * 60, 15 * 60],
    historyDuration = 24 * 60 * 60,
    message = 'Too many failed login attempts.',
}) {
    if (!name || !accountKey) throw new Error('Invalid credential failure guard configuration');

    const threshold = positiveInteger(failureThreshold, 3);
    const waits = Array.isArray(backoffSteps) && backoffSteps.length > 0
        ? backoffSteps.map(value => positiveInteger(value, 0)).filter(Boolean)
        : [60, 5 * 60, 15 * 60];
    const maxBackoff = Math.max(...waits);
    const attempts = makeStore(`${name}_failures`, {
        points: 1_000_000,
        duration: historyDuration,
    });
    // This store is only written with block(); any existing entry is an active lock.
    const locks = makeStore(`${name}_failure_locks`, {
        points: 1,
        duration: maxBackoff,
        blockDuration: maxBackoff,
    });

    function scopedKeys(req) {
        const keys = [{ scope: 'ip', key: `ip:${hashKey(getClientIp(req))}` }];
        const deviceId = getDeviceId(req);
        if (deviceId) keys.push({ scope: 'device', key: `device:${hashKey(deviceId)}` });

        const account = accountKey(req);
        if (account !== null && account !== undefined && String(account).trim()) {
            keys.push({
                scope: 'account',
                key: `account:${hashKey(String(account).trim().toLowerCase())}`,
            });
        }
        return keys;
    }

    function sendLocked(res, retryAfter, scopes) {
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Scope', [...new Set(scopes)].join(','));
        return res.status(429).json({
            error: `${message} Please try again in ${formatTime(retryAfter)}.`,
            retryAfter,
            locked: true,
        });
    }

    return async function credentialFailureGuard(req, res, next) {
        const keys = scopedKeys(req);
        const lockResults = await Promise.allSettled(keys.map(item => locks.get(item.key)));
        const activeLocks = lockResults
            .map((result, index) => ({ result, ...keys[index] }))
            .filter(item => item.result.status === 'fulfilled' && item.result.value);

        if (activeLocks.length > 0) {
            const retryAfter = Math.max(...activeLocks.map(item => (
                Math.max(1, Math.ceil((item.result.value.msBeforeNext || 1000) / 1000))
            )));
            return sendLocked(res, retryAfter, activeLocks.map(item => item.scope));
        }

        req[requestProperty] = {
            recordFailure: async () => {
                const results = await Promise.allSettled(keys.map(item => attempts.consume(item.key)));
                const newlyLocked = [];

                await Promise.all(results.map(async (result, index) => {
                    if (result.status !== 'fulfilled') return;
                    const failureCount = result.value.consumedPoints;
                    if (failureCount < threshold) return;

                    const stepIndex = Math.min(failureCount - threshold, waits.length - 1);
                    const waitSeconds = waits[stepIndex];
                    await locks.block(keys[index].key, waitSeconds);
                    newlyLocked.push({ scope: keys[index].scope, waitSeconds });
                }));

                if (newlyLocked.length === 0) return { locked: false, retryAfter: 0, scopes: [] };
                return {
                    locked: true,
                    retryAfter: Math.max(...newlyLocked.map(item => item.waitSeconds)),
                    scopes: newlyLocked.map(item => item.scope),
                };
            },
            reset: async () => {
                await Promise.allSettled(keys.flatMap(item => [
                    attempts.delete(item.key),
                    locks.delete(item.key),
                ]));
            },
            sendLocked: result => sendLocked(res, result.retryAfter, result.scopes),
        };

        return next();
    };
}

function createLayeredRateLimiter({
    name,
    duration,
    blockDuration = duration,
    ipPoints,
    devicePoints,
    accountPoints,
    accountKey,
    message = 'Too many requests. Please try again later.',
}) {
    if (!name || !duration || !ipPoints) throw new Error('Invalid rate limiter configuration');

    const ipLimiter = makeStore(`${name}_ip`, { points: ipPoints, duration, blockDuration });
    const deviceLimiter = devicePoints
        ? makeStore(`${name}_device`, { points: devicePoints, duration, blockDuration })
        : null;
    const accountLimiter = accountPoints && accountKey
        ? makeStore(`${name}_account`, { points: accountPoints, duration, blockDuration })
        : null;

    return async function layeredRateLimit(req, res, next) {
        const sourceChecks = [
            { scope: 'ip', promise: ipLimiter.consume(`ip:${hashKey(getClientIp(req))}`) },
        ];

        const deviceId = getDeviceId(req);
        if (deviceLimiter && deviceId) {
            sourceChecks.push({
                scope: 'device',
                promise: deviceLimiter.consume(`device:${hashKey(deviceId)}`),
            });
        }

        // Check source limits before touching an account counter. A source that
        // is already blocked must not be able to poison counters for many
        // different victim accounts by continuing to submit requests.
        const sourceResults = await Promise.allSettled(sourceChecks.map(check => check.promise));
        const rejected = sourceResults
            .map((result, index) => ({ result, scope: sourceChecks[index].scope }))
            .filter(item => item.result.status === 'rejected');

        if (rejected.length === 0 && accountLimiter) {
            const account = accountKey(req);
            if (account !== null && account !== undefined && String(account).trim()) {
                const result = await Promise.allSettled([
                    accountLimiter.consume(`account:${hashKey(String(account).trim().toLowerCase())}`),
                ]);
                if (result[0].status === 'rejected') {
                    rejected.push({ result: result[0], scope: 'account' });
                }
            }
        }

        if (rejected.length === 0) return next();

        const retryAfter = Math.max(...rejected.map(item => retrySeconds(item.result)));
        const scopes = rejected.map(item => item.scope).join(',');
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Scope', scopes);
        return res.status(429).json({
            error: message,
            retryAfter,
            locked: true,
        });
    };
}

const policies = {
    // Broad abuse/DoS ceiling for API traffic. Sensitive routes below have much
    // tighter policies. Webhooks are deliberately excluded in app.js.
    api: createLayeredRateLimiter({
        name: 'api',
        duration: 60,
        blockDuration: 60,
        ipPoints: positiveInteger(process.env.RATE_LIMIT_API_IP, 1200),
        devicePoints: positiveInteger(process.env.RATE_LIMIT_API_DEVICE, 300),
    }),
    userLogin: createLayeredRateLimiter({
        name: 'user_login',
        duration: 15 * 60,
        blockDuration: 15 * 60,
        ipPoints: positiveInteger(process.env.RATE_LIMIT_LOGIN_IP, 30),
        devicePoints: positiveInteger(process.env.RATE_LIMIT_LOGIN_DEVICE, 10),
        accountPoints: positiveInteger(process.env.RATE_LIMIT_LOGIN_ACCOUNT, 10),
        accountKey: req => req.body?.phone,
        message: 'Too many login attempts from this device or network. Please try again later.',
    }),
    userLoginFailures: createCredentialFailureGuard({
        name: 'user_login',
        accountKey: req => req.body?.phone,
        failureThreshold: positiveInteger(process.env.RATE_LIMIT_LOGIN_FAILURES, 3),
        backoffSteps: parseBackoffSteps(process.env.RATE_LIMIT_LOGIN_BACKOFF_SECONDS, [60, 5 * 60, 15 * 60]),
        message: 'Too many failed login attempts.',
    }),
    adminLogin: createLayeredRateLimiter({
        name: 'admin_login',
        duration: 30 * 60,
        blockDuration: 30 * 60,
        ipPoints: positiveInteger(process.env.RATE_LIMIT_ADMIN_LOGIN_IP, 10),
        devicePoints: positiveInteger(process.env.RATE_LIMIT_ADMIN_LOGIN_DEVICE, 5),
        accountPoints: positiveInteger(process.env.RATE_LIMIT_ADMIN_LOGIN_ACCOUNT, 5),
        accountKey: req => req.body?.username,
        message: 'Too many admin login attempts from this device or network. Please try again later.',
    }),
    adminLoginFailures: createCredentialFailureGuard({
        name: 'admin_login',
        accountKey: req => req.body?.username,
        failureThreshold: positiveInteger(process.env.RATE_LIMIT_ADMIN_LOGIN_FAILURES, 3),
        backoffSteps: parseBackoffSteps(process.env.RATE_LIMIT_ADMIN_LOGIN_BACKOFF_SECONDS, [5 * 60, 15 * 60, 30 * 60]),
        message: 'Too many failed admin login attempts.',
    }),
    signup: createLayeredRateLimiter({
        name: 'signup',
        duration: 60 * 60,
        blockDuration: 60 * 60,
        ipPoints: positiveInteger(process.env.RATE_LIMIT_SIGNUP_IP, 30),
        devicePoints: positiveInteger(process.env.RATE_LIMIT_SIGNUP_DEVICE, 3),
        accountPoints: positiveInteger(process.env.RATE_LIMIT_SIGNUP_ACCOUNT, 3),
        accountKey: req => req.body?.email || req.body?.phone,
        message: 'Too many signup attempts from this device or network. Please try again later.',
    }),
    otp: createLayeredRateLimiter({
        name: 'otp',
        duration: 10 * 60,
        blockDuration: 15 * 60,
        ipPoints: positiveInteger(process.env.RATE_LIMIT_OTP_IP, 30),
        devicePoints: positiveInteger(process.env.RATE_LIMIT_OTP_DEVICE, 8),
        accountPoints: positiveInteger(process.env.RATE_LIMIT_OTP_ACCOUNT, 8),
        accountKey: req => req.body?.userId || req.body?.adminId || req.body?.email,
        message: 'Too many verification attempts from this device or network. Please try again later.',
    }),
    passwordRecovery: createLayeredRateLimiter({
        name: 'password_recovery',
        duration: 60 * 60,
        blockDuration: 60 * 60,
        ipPoints: positiveInteger(process.env.RATE_LIMIT_RECOVERY_IP, 20),
        devicePoints: positiveInteger(process.env.RATE_LIMIT_RECOVERY_DEVICE, 5),
        accountPoints: positiveInteger(process.env.RATE_LIMIT_RECOVERY_ACCOUNT, 5),
        accountKey: req => req.body?.email || req.body?.id,
        message: 'Too many password recovery attempts from this device or network. Please try again later.',
    }),
    ai: createLayeredRateLimiter({
        name: 'ai_chat',
        duration: 60 * 60,
        blockDuration: 60 * 60,
        ipPoints: positiveInteger(process.env.RATE_LIMIT_AI_IP, 60),
        devicePoints: positiveInteger(process.env.RATE_LIMIT_AI_DEVICE, 30),
        accountPoints: positiveInteger(process.env.RATE_LIMIT_AI_ACCOUNT, 20),
        accountKey: req => req.user?.id,
        message: 'You have reached the Ufriends AI limit for now. Please try again later.',
    }),
    action: createLayeredRateLimiter({
        name: 'action',
        duration: 60,
        blockDuration: 60,
        ipPoints: positiveInteger(process.env.RATE_LIMIT_ACTION_IP, 120),
        devicePoints: positiveInteger(process.env.RATE_LIMIT_ACTION_DEVICE, 30),
        message: 'Too many actions from this device or network. Please wait and try again.',
    }),
};

module.exports = {
    createCredentialFailureGuard,
    createLayeredRateLimiter,
    getClientIp,
    getDeviceId,
    policies,
};
