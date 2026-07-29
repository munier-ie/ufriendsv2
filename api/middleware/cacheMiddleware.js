/**
 * Redis-backed HTTP cache middleware for Express with in-memory fallback.
 *
 * Cache key includes: request path + query string + user type (so Agent/Vendor/User
 * each get their own properly-priced cache entry).
 */

const { getCache, setCache, delCache, redisClient, isRedisAvailable } = require('../utils/redis');
const store = new Map(); // Fallback in-memory map if Redis is temporarily offline

/**
 * Flush Redis keys matching pattern
 */
async function flushRedisCache(pattern = 'HTTP_CACHE:*') {
    try {
        if (redisClient && isRedisAvailable()) {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(...keys);
                console.log(`[REDIS] Flushed ${keys.length} cache keys matching pattern: ${pattern}`);
            }
        }
    } catch (e) {
        console.warn('[REDIS] flushRedisCache error:', e.message);
    }
}

/**
 * Purge all entries matching prefix in memory & Redis
 */
function flushByPrefix(prefix) {
    let count = 0;
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
            count++;
        }
    }
    flushRedisCache(`HTTP_CACHE:*${prefix}*`).catch(() => {});
    if (count > 0) {
        console.log(`[CACHE] Flushed ${count} in-memory entries with prefix: ${prefix}`);
    }
    return count;
}

/** Wipe the entire cache. */
function flushAll() {
    const count = store.size;
    store.clear();
    flushRedisCache('HTTP_CACHE:*').catch(() => {});
    console.log(`[CACHE] Flushed all cache entries.`);
    return count;
}

/** Return current cache stats. */
function getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    for (const [, value] of store) {
        if (value.expiresAt > now) active++;
        else expired++;
    }
    return { totalKeys: store.size, active, expired };
}

/**
 * Express middleware factory.
 * @param {number} ttlSeconds - How long to cache the response (default: 300s = 5 min)
 * @returns Express middleware function
 */
function cache(ttlSeconds = 300) {
    return async (req, res, next) => {
        // Only cache safe GET requests
        if (req.method !== 'GET') return next();

        const userType = req.user?.type ?? 'anon';
        const key = `HTTP_CACHE:${req.originalUrl}:type=${userType}`;
        const now = Date.now();

        // 1. Try Redis cache first
        try {
            const redisCached = await getCache(key);
            if (redisCached) {
                console.log(`[REDIS HTTP CACHE HIT] ${key}`);
                res.setHeader('X-Cache', 'HIT-REDIS');
                return res.json(redisCached);
            }
        } catch (e) {}

        // 2. Fallback to memory store if Redis is unavailable
        const memoryCached = store.get(key);
        if (memoryCached && memoryCached.expiresAt > now) {
            console.log(`[MEMORY HTTP CACHE HIT] ${key}`);
            res.setHeader('X-Cache', 'HIT-MEMORY');
            return res.json(memoryCached.data);
        }

        // Cache MISS — intercept res.json to store the response
        console.log(`[HTTP CACHE MISS] ${key}`);
        res.setHeader('X-Cache', 'MISS');

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only cache successful HTTP responses (200 OK)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                setCache(key, body, ttlSeconds).catch(() => {});
                store.set(key, {
                    data: body,
                    expiresAt: now + ttlSeconds * 1000
                });
            }
            return originalJson(body);
        };

        next();
    };
}

module.exports = { cache, flushByPrefix, flushAll, getStats };
