const Redis = require('ioredis');

// Redis URL from environment or default to local self-hosted instance
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisClient = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) {
        console.warn('[Redis] Max reconnect attempts reached. Operating in fallback mode.');
        return null; // Stop reconnecting automatically if offline
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: false
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('[Redis] Successfully connected to self-hosted Redis server.');
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    console.error('[Redis] Connection Error:', err.message);
  });
} catch (err) {
  console.error('[Redis] Initialization Error:', err.message);
}

/**
 * Get value from Redis cache
 */
async function getCache(key) {
  if (!isRedisAvailable || !redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn(`[Redis] getCache error for key ${key}:`, err.message);
    return null;
  }
}

/**
 * Set value in Redis cache with TTL in seconds
 */
async function setCache(key, value, ttlSeconds = 86400) {
  if (!isRedisAvailable || !redisClient) return false;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await redisClient.set(key, serialized);
    }
    return true;
  } catch (err) {
    console.warn(`[Redis] setCache error for key ${key}:`, err.message);
    return false;
  }
}

/**
 * Delete key from Redis
 */
async function delCache(key) {
  if (!isRedisAvailable || !redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn(`[Redis] delCache error for key ${key}:`, err.message);
    return false;
  }
}

/**
 * Acquire a distributed lock using Redis SET NX EX
 * @param {string} lockKey - Unique lock key
 * @param {number} ttlMs - Lock TTL in milliseconds (default 30 seconds)
 * @returns {string|null} - Lock identifier if acquired, null otherwise
 */
async function acquireLock(lockKey, ttlMs = 30000) {
  if (!isRedisAvailable || !redisClient) return null;
  try {
    const lockValue = `${Date.now()}-${Math.random()}`;
    const acquired = await redisClient.set(lockKey, lockValue, 'PX', ttlMs, 'NX');
    return acquired === 'OK' ? lockValue : null;
  } catch (err) {
    console.warn(`[Redis] acquireLock error for ${lockKey}:`, err.message);
    return null;
  }
}

/**
 * Release a distributed lock safely using Lua script (verifies value matches)
 */
async function releaseLock(lockKey, lockValue) {
  if (!isRedisAvailable || !redisClient || !lockValue) return false;
  try {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redisClient.eval(luaScript, 1, lockKey, lockValue);
    return true;
  } catch (err) {
    console.warn(`[Redis] releaseLock error for ${lockKey}:`, err.message);
    return false;
  }
}

module.exports = {
  redisClient,
  isRedisAvailable: () => isRedisAvailable,
  getCache,
  setCache,
  delCache,
  acquireLock,
  releaseLock
};
