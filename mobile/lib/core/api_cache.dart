/// Centralized in-memory API response cache for the mobile app.
///
/// Strategy: Cache-first / stale-while-revalidate.
/// Every GET endpoint in [ApiService] checks this cache before hitting the
/// network.  If a fresh (within TTL) entry exists the caller gets instant data
/// with zero skeleton loader.  The network request can optionally run in the
/// background to refresh the entry (handled by the caller).
///
/// TTLs are intentionally short (1–10 min) so the user always sees near-real-
/// time data.  After every mutation (purchase, update, delete …) the relevant
/// cache keys are busted so the next read gets fresh server data.
///
/// Usage:
///   ApiCache.set('profile', data, ttl: const Duration(minutes: 2));
///   final cached = ApiCache.get('profile');
///   ApiCache.bust('profile');     // single key
///   ApiCache.bustPrefix('trans'); // bust all keys starting with "trans"
///   ApiCache.clearAll();          // on logout
library;

class _CacheEntry {
  final dynamic data;
  final DateTime expiresAt;

  _CacheEntry(this.data, this.expiresAt);

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

class ApiCache {
  ApiCache._();

  static final Map<String, _CacheEntry> _store = {};

  // ── Default TTLs per domain ────────────────────────────────────────────────

  /// Services / pricing endpoints – change rarely.
  static const Duration ttlServices = Duration(minutes: 5);

  /// User profile – balance changes after purchases.
  static const Duration ttlProfile = Duration(minutes: 2);

  /// Transactions – new entries appear often.
  static const Duration ttlTransactions = Duration(minutes: 1);

  /// Beneficiaries – user rarely adds new ones.
  static const Duration ttlBeneficiaries = Duration(minutes: 5);

  /// Notifications – should stay reasonably fresh.
  static const Duration ttlNotifications = Duration(minutes: 1);

  /// Virtual accounts – rarely changes.
  static const Duration ttlVirtualAccounts = Duration(minutes: 3);

  /// Government pricing (NIN / BVN / CAC / Manual) – almost never changes.
  static const Duration ttlGovPricing = Duration(minutes: 10);

  /// Wallet stats / chart data.
  static const Duration ttlWalletStats = Duration(minutes: 2);

  /// Referral stats.
  static const Duration ttlReferrals = Duration(minutes: 2);

  /// Academy content.
  static const Duration ttlAcademy = Duration(minutes: 5);

  /// Public settings – almost never changes.
  static const Duration ttlPublicSettings = Duration(minutes: 10);

  /// Support messages.
  static const Duration ttlSupport = Duration(minutes: 2);

  /// Upgrade plans.
  static const Duration ttlUpgradePlans = Duration(minutes: 5);

  // ── Core API ───────────────────────────────────────────────────────────────

  /// Retrieve a cached value.  Returns `null` if the key doesn't exist or has
  /// expired.
  static dynamic get(String key) {
    final entry = _store[key];
    if (entry == null) return null;
    if (entry.isExpired) {
      _store.remove(key);
      return null;
    }
    return entry.data;
  }

  /// Store a value with a given TTL.
  static void set(String key, dynamic data, {Duration ttl = ttlServices}) {
    _store[key] = _CacheEntry(data, DateTime.now().add(ttl));
  }

  /// Remove a single cache entry.
  static void bust(String key) {
    _store.remove(key);
  }

  /// Remove all entries whose key starts with [prefix].
  /// Useful for busting related groups (e.g. all "services_*" entries).
  static void bustPrefix(String prefix) {
    _store.removeWhere((key, _) => key.startsWith(prefix));
  }

  /// Remove specific keys after a mutation.
  static void bustKeys(List<String> keys) {
    for (final key in keys) {
      _store.remove(key);
    }
  }

  /// Wipe the entire cache.  Called on logout.
  static void clearAll() {
    _store.clear();
  }
}
