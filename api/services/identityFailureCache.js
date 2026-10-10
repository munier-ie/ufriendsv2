const crypto = require('crypto');
const { getCache, setCache } = require('../utils/redis');

const PROVIDER_FAILURE_TTL_SECONDS = 60 * 60;
const CACHE_PREFIX = 'IDENTITY:PROVIDER_FAILURE';

function normalizeLookupValue(value) {
  return String(value || '').trim().replace(/[\s\-]/g, '');
}

function buildCacheKey(service, lookupValue) {
  const normalized = normalizeLookupValue(lookupValue);
  const digest = crypto.createHash('sha256').update(normalized).digest('hex');
  return `${CACHE_PREFIX}:${service}:${digest}`;
}

function sanitizeMessage(message, fallbackMessage) {
  const value = typeof message === 'string' ? message.trim() : '';
  return (value || fallbackMessage).slice(0, 500);
}

async function getProviderFailure(service, lookupValue) {
  const cached = await getCache(buildCacheKey(service, lookupValue));
  if (!cached || cached.kind !== 'provider_failure' || !cached.message) return null;

  return {
    success: false,
    transientFailure: true,
    cached: true,
    message: cached.message
  };
}

async function cacheProviderFailure(service, lookupValue, message, fallbackMessage) {
  const entry = {
    kind: 'provider_failure',
    message: sanitizeMessage(message, fallbackMessage),
    cachedAt: new Date().toISOString()
  };

  await setCache(
    buildCacheKey(service, lookupValue),
    entry,
    PROVIDER_FAILURE_TTL_SECONDS
  );

  return {
    success: false,
    transientFailure: true,
    message: entry.message
  };
}

function isCacheableHttpFailure(status) {
  // Cache completed, input-related provider responses. Authentication,
  // throttling, timeouts and provider/server failures must be retried normally.
  return status === 400 || status === 422;
}

module.exports = {
  PROVIDER_FAILURE_TTL_SECONDS,
  buildCacheKey,
  getProviderFailure,
  cacheProviderFailure,
  isCacheableHttpFailure
};
