const { createCredentialFailureGuard } = require('./rateLimit');

function positiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBackoffSteps(value, fallback) {
    if (!value) return fallback;
    const steps = String(value)
        .split(',')
        .map(item => Number.parseInt(item.trim(), 10))
        .filter(item => Number.isSafeInteger(item) && item > 0);
    return steps.length > 0 ? steps : fallback;
}

// Must run after authenticateUser so the account layer is bound to req.user.id.
// Redis makes failures consistent across PM2 workers and API instances; IP and
// device layers prevent a user from resetting the backoff in another browser.
module.exports = createCredentialFailureGuard({
    name: 'transaction_pin',
    requestProperty: 'pinRateLimit',
    accountKey: req => req.user?.id,
    failureThreshold: positiveInteger(process.env.RATE_LIMIT_PIN_FAILURES, 3),
    backoffSteps: parseBackoffSteps(process.env.RATE_LIMIT_PIN_BACKOFF_SECONDS, [60, 5 * 60, 15 * 60]),
    message: 'Too many incorrect transaction PIN attempts.',
});
