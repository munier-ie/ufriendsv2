/**
 * PIN Rate Limiter Middleware
 * Mirrors the same progressive lockout logic as loginRateLimit.js.
 * Tracks failed PIN attempts per userId (in-memory).
 * 
 * Lockout progression:
 *   1st fail  → no wait
 *   2nd fail  → no wait
 *   3rd fail  → 1 min lockout
 *   4th fail  → 5 min lockout
 *   5th+ fail → 15 min lockout
 */

const pinAttempts = new Map(); // userId -> { count, lockedUntil }

const LOCKOUT_STEPS = [0, 0, 1 * 60, 5 * 60, 15 * 60]; // seconds, indexed by attempt count

function getWaitSeconds(count) {
    if (count < LOCKOUT_STEPS.length) return LOCKOUT_STEPS[count];
    return LOCKOUT_STEPS[LOCKOUT_STEPS.length - 1]; // cap at 15 min
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} minute${mins !== 1 ? 's' : ''}`;
}

function pinRateLimit(req, res, next) {
    // userId comes from auth middleware (req.user), so this must run after auth
    const userId = req.user?.id;
    if (!userId) return next();

    const now = Date.now();
    const record = pinAttempts.get(userId) || { count: 0, lockedUntil: 0 };

    if (record.lockedUntil && now < record.lockedUntil) {
        const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
        return res.status(429).json({
            error: `Too many incorrect PIN attempts. Try again in ${formatTime(retryAfter)}.`,
            retryAfter,
            locked: true
        });
    }

    // Attach failure recorder to request for use in route handlers
    req._recordPinFailure = () => {
        const current = pinAttempts.get(userId) || { count: 0, lockedUntil: 0 };
        const newCount = current.count + 1;
        const waitSeconds = getWaitSeconds(newCount);
        const lockedUntil = waitSeconds > 0 ? Date.now() + waitSeconds * 1000 : 0;
        pinAttempts.set(userId, { count: newCount, lockedUntil });
        return { count: newCount, waitSeconds };
    };

    next();
}

// Call on successful PIN use to clear attempts
pinRateLimit.onSuccess = (userId) => {
    if (userId) pinAttempts.delete(userId);
};

module.exports = pinRateLimit;
