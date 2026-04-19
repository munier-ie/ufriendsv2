const loginAttempts = new Map(); // phone -> { count, lockedUntil }

const LOCKOUT_STEPS = [0, 0, 0, 1 * 60, 5 * 60, 15 * 60]; // seconds, indexed by attempt count

function getWaitSeconds(count) {
    if (count < LOCKOUT_STEPS.length) return LOCKOUT_STEPS[count];
    return LOCKOUT_STEPS[LOCKOUT_STEPS.length - 1]; // 15 min cap
}

function loginRateLimit(req, res, next) {
    const phone = req.body?.phone;
    if (!phone) return next(); // let route validation handle missing phone

    const now = Date.now();
    const record = loginAttempts.get(phone) || { count: 0, lockedUntil: 0 };

    // Check if currently locked
    if (record.lockedUntil && now < record.lockedUntil) {
        const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
        return res.status(429).json({
            error: `Too many failed login attempts. Please try again in ${formatTime(retryAfter)}.`,
            retryAfter,
            locked: true
        });
    }

    // Store handler to record failure — called from auth route if login fails
    req._recordLoginFailure = () => {
        const current = loginAttempts.get(phone) || { count: 0, lockedUntil: 0 };
        const newCount = current.count + 1;
        const waitSeconds = getWaitSeconds(newCount);
        const lockedUntil = waitSeconds > 0 ? Date.now() + waitSeconds * 1000 : 0;
        loginAttempts.set(phone, { count: newCount, lockedUntil });
        return { count: newCount, waitSeconds };
    };

    next();
}

loginRateLimit.onSuccess = (phone) => {
    if (phone) loginAttempts.delete(phone);
};

function formatTime(seconds) {
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} minute${mins !== 1 ? 's' : ''}`;
}

module.exports = loginRateLimit;
