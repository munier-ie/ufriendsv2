async function rejectInvalidPin(req, res, {
    message = 'Invalid transaction PIN',
    status = 400,
} = {}) {
    const result = await req.pinRateLimit?.recordFailure();
    if (result?.locked) return req.pinRateLimit.sendLocked(result);
    return res.status(status).json({ error: message });
}

async function clearPinFailures(req) {
    await req.pinRateLimit?.reset();
}

module.exports = { clearPinFailures, rejectInvalidPin };
