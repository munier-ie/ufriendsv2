function safeError(error) {
    if (!error || typeof error !== 'object') {
        return { name: 'Error', code: 'UNKNOWN_ERROR' };
    }

    return {
        name: String(error.name || 'Error').slice(0, 80),
        code: String(error.code || error.status || 'UNCLASSIFIED_ERROR').slice(0, 80),
    };
}

module.exports = { safeError };
