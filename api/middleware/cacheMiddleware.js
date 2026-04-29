/**
 * In-memory cache middleware for Express — zero dependencies.
 *
 * Uses a plain Map with TTL (time-to-live) values. This is intentionally
 * lightweight: it lives in the Node.js process RAM, survives between requests,
 * and resets on server restart/deploy.
 *
 * Usage on a route:
 *   router.get('/all', authenticateUser, cache(300), async (req, res) => { ... });
 *
 * Cache key includes: request path + query string + user type (so Agent/Vendor/User
 * each get their own properly-priced cache entry).
 *
 * Invalidation:
 *   const { flushByPrefix, flushAll } = require('./cacheMiddleware');
 *   flushByPrefix('/api/services'); // bust services cache after admin price update
 */

const store = new Map(); // key → { data, expiresAt }

/**
 * Purge all entries whose key starts with `prefix`.
 * @param {string} prefix - e.g. '/api/services'
 */
function flushByPrefix(prefix) {
    let count = 0;
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
            count++;
        }
    }
    if (count > 0) {
        console.log(`[CACHE] Flushed ${count} entries with prefix: ${prefix}`);
    }
    return count;
}

/** Wipe the entire cache (admin "flush all" button). */
function flushAll() {
    const count = store.size;
    store.clear();
    console.log(`[CACHE] Flushed all ${count} entries.`);
    return count;
}

/** Return current cache stats for the admin endpoint. */
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
    return (req, res, next) => {
        // Only cache safe GET requests
        if (req.method !== 'GET') return next();

        // Build a cache key that is unique per URL + user type (1=user, 2=agent, 3=vendor)
        const userType = req.user?.type ?? 'anon';
        const key = `${req.originalUrl}:type=${userType}`;

        const now = Date.now();
        const cached = store.get(key);

        if (cached && cached.expiresAt > now) {
            // Cache HIT — return early, no DB touch
            console.log(`[CACHE HIT] ${key}`);
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached.data);
        }

        // Cache MISS — intercept res.json to store the response
        console.log(`[CACHE MISS] ${key}`);
        res.setHeader('X-Cache', 'MISS');

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
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
