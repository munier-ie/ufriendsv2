const STORAGE_KEY = 'ufriends_device_id';
let fallbackId;

function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(24);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function getDeviceId() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
        const id = createId();
        localStorage.setItem(STORAGE_KEY, id);
        return id;
    } catch {
        fallbackId ||= createId();
        return fallbackId;
    }
}
