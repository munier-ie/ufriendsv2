/**
 * Frontend in-memory request cache for Axios.
 *
 * Strategy: Whitelist-only. Only endpoints in CACHEABLE_PREFIXES are ever
 * cached. Dynamic/user-specific endpoints (wallet, transactions, profile)
 * are intentionally NEVER cached.
 *
 * TTL: 5 minutes (300,000 ms). Matches the backend cache TTL so both layers
 * expire in sync.
 *
 * How it works:
 *   - On each GET request, if the URL matches a whitelisted prefix, we check
 *     the cache. If a fresh entry exists, Axios returns the cached data directly
 *     (0 network request, 0 ms latency).
 *   - If not cached, the real request fires, and the response is stored.
 *   - The cache key is the full request URL (including query params).
 *
 * To bust the cache manually (e.g., after a successful purchase):
 *   import { bustCache } from '@/lib/apiCache';
 *   bustCache('/api/services'); // clears all services entries
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

/** @type {Map<string, { data: any, expiresAt: number, promise: Promise<any> | null }>} */
const _cache = new Map();

/**
 * Endpoints whose GET responses should be cached.
 * Add a prefix here and ALL sub-paths are automatically cached.
 * Never add user-specific or transactional endpoints here.
 */
export const CACHEABLE_PREFIXES = [
    '/api/services/all',
    '/api/services/data',
    '/api/services/airtime',
    '/api/services/cable',
    '/api/services/electricity',
    '/api/services/exam',
    '/api/services/smile',
    '/api/admin/config/networks',
    '/api/admin/provider-status',
    '/api/admin/routing',
];

/**
 * Returns true if this URL should be cached.
 * @param {string} url
 */
export function isCacheable(url) {
    return CACHEABLE_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Get a cached entry if it exists and hasn't expired.
 * @param {string} key
 * @returns {any | null}
 */
export function getCache(key) {
    const entry = _cache.get(key);
    if (entry) {
        if (Date.now() > entry.expiresAt) {
            _cache.delete(key);
            try { sessionStorage.removeItem('api_cache_' + key); } catch (_) {}
            return null;
        }
        return entry.data;
    }
    // Check sessionStorage fallback
    try {
        const raw = sessionStorage.getItem('api_cache_' + key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Date.now() <= parsed.expiresAt) {
                _cache.set(key, parsed); // populate in-memory cache
                return parsed.data;
            } else {
                sessionStorage.removeItem('api_cache_' + key);
            }
        }
    } catch (_) {}
    return null;
}

/**
 * Store a value in the cache.
 * @param {string} key
 * @param {any} data
 */
export function setCache(key, data) {
    const expiresAt = Date.now() + TTL_MS;
    const payload = { data, expiresAt };
    _cache.set(key, payload);
    try {
        sessionStorage.setItem('api_cache_' + key, JSON.stringify(payload));
    } catch (_) {}
}

/**
 * Remove all cache entries whose key starts with `prefix`.
 * Call this after a successful mutation that would change service data.
 * @param {string} prefix
 */
export function bustCache(prefix) {
    let count = 0;
    for (const key of _cache.keys()) {
        if (key.startsWith(prefix)) {
            _cache.delete(key);
            try { sessionStorage.removeItem('api_cache_' + key); } catch (_) {}
            count++;
        }
    }
    // Clear sessionStorage keys matching prefix
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith('api_cache_' + prefix)) {
                sessionStorage.removeItem(k);
            }
        }
    } catch (_) {}
    return count;
}

/** Wipe the entire local cache. */
export function clearAllCache() {
    _cache.clear();
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith('api_cache_')) {
                sessionStorage.removeItem(k);
            }
        }
    } catch (_) {}
}
