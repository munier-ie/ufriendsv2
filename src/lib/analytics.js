/**
 * Umami Analytics Helper Utility
 * Safe wrapper around window.umami for client-side event tracking.
 */

/**
 * Tracks a custom event in Umami
 * @param {string} eventName - Name of the event (e.g. 'buy_data_click', 'nin_slip_download')
 * @param {Record<string, any>} [eventData] - Optional metadata/payload
 */
export function trackEvent(eventName, eventData = {}) {
  if (typeof window !== 'undefined' && window.umami && typeof window.umami.track === 'function') {
    try {
      window.umami.track(eventName, eventData);
    } catch (err) {
      console.warn('[Analytics] Failed to track event:', err);
    }
  }
}

/**
 * Identifies a user or session with metadata
 * @param {Record<string, any>} sessionData
 */
export function identifyUser(sessionData = {}) {
  if (typeof window !== 'undefined' && window.umami && typeof window.umami.identify === 'function') {
    try {
      window.umami.identify(sessionData);
    } catch (err) {
      console.warn('[Analytics] Failed to identify user:', err);
    }
  }
}
