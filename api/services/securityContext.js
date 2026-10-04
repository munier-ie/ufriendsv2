const { AsyncLocalStorage } = require('node:async_hooks');
const crypto = require('node:crypto');
const context = new AsyncLocalStorage();

function requestContext(req, _res, next) {
    context.run({ req, requestId: crypto.randomUUID() }, next);
}

function deviceInfo(agent = '') {
    const ua = String(agent).slice(0, 500);
    const browser = /Edg\/([\d.]+)/.exec(ua) || /OPR\/([\d.]+)/.exec(ua) || /Firefox\/([\d.]+)/.exec(ua) || /Chrome\/([\d.]+)/.exec(ua) || /Version\/([\d.]+).*Safari/.exec(ua);
    const name = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Dart|Flutter|UfriendsMobile/.test(ua) ? 'Ufriends Mobile' : 'Unknown';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown';
    return { userAgent: ua, browser: `${name}${browser ? ` ${browser[1]}` : ''}`, os, device: /Mobile|Android|iPhone|Dart|Flutter/.test(ua) ? 'Mobile' : /iPad|Tablet/.test(ua) ? 'Tablet' : 'Desktop / unknown' };
}

function metadata(req = context.getStore()?.req) {
    if (!req) return { channel: 'system' };
    const trust = req.app?.get('trust proxy fn');
    const trustedPeer = trust && req.socket?.remoteAddress && trust(req.socket.remoteAddress, 0);
    // Geo headers must be overwritten at a trusted ingress, never accepted from direct clients.
    const location = trustedPeer && process.env.TRUST_GEO_HEADERS === 'true'
        ? [req.headers['cf-ipcity'], req.headers['cf-region'], req.headers['cf-ipcountry']].filter(Boolean).join(', ').slice(0, 200)
        : '';
    return {
        requestId: context.getStore()?.requestId,
        ip: req.ip || req.socket?.remoteAddress || null,
        ...deviceInfo(req.headers?.['user-agent']),
        location: location || 'Unavailable',
        locationApproximate: true,
        route: req.originalUrl?.split('?')[0]?.slice(0, 200),
        channel: req.originalUrl?.startsWith('/api/v1/') ? 'api' : 'web/mobile',
        actorType: req.admin ? 'admin' : req.user ? 'user' : 'system',
        actorId: req.admin?.id || req.user?.id || null
    };
}
module.exports = { requestContext, metadata, deviceInfo, context };
