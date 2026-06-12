import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart';

class BiometricService {
  static final LocalAuthentication _auth = LocalAuthentication();
  static const String _biometricsEnabledKey = 'biometrics_enabled';

  /// Check if the device has biometric hardware and has enrolled biometric credentials.
  static Future<bool> canAuthenticate() async {
    try {
      final bool canCheck = await _auth.canCheckBiometrics;
      final bool isSupported = await _auth.isDeviceSupported();
      return canCheck && isSupported;
    } on PlatformException catch (_) {
      return false;
    }
  }

  /// Trigger the native biometrics verification prompt (Fingerprint/Face ID).
  static Future<bool> authenticate() async {
    try {
      return await _auth.authenticate(
        localizedReason: 'Scan your biometric credential to unlock the application',
        options: const AuthenticationOptions(
          useErrorDialogs: true,
          stickyAuth: true,
          biometricOnly: true,
        ),
      );
    } on PlatformException catch (_) {
      return false;
    }
  }

  /// Get the user preference setting for biometrics.
  static Future<bool> isBiometricsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_biometricsEnabledKey) ?? false;
  }

  /// Save the user preference setting for biometrics.
  static Future<void> setBiometricsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_biometricsEnabledKey, enabled);
  }

  static const String _behaviorKey = 'biometrics_behavior';
  static const String _timeoutKey = 'biometrics_timeout_minutes';
  static const String _backgroundTimeKey = 'biometrics_backgrounded_time';

  /// Get biometrics unlock behavior preference ('always', 'cold_start', 'timeout').
  static Future<String> getBehavior() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_behaviorKey) ?? 'always';
  }

  /// Save biometrics unlock behavior preference.
  static Future<void> setBehavior(String behavior) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_behaviorKey, behavior);
  }

  /// Get biometric lock timeout in minutes.
  static Future<int> getTimeoutMinutes() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt(_timeoutKey) ?? 5;
  }

  /// Save biometric lock timeout in minutes.
  static Future<void> setTimeoutMinutes(int minutes) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_timeoutKey, minutes);
  }

  /// Save current time as backgrounded time.
  static Future<void> recordBackgroundTime() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_backgroundTimeKey, DateTime.now().millisecondsSinceEpoch);
  }

  /// Get the number of seconds elapsed since the app was backgrounded.
  static Future<int> getElapsedSecondsSinceBackground() async {
    final prefs = await SharedPreferences.getInstance();
    final int bgTime = prefs.getInt(_backgroundTimeKey) ?? 0;
    if (bgTime == 0) return 0;
    final int now = DateTime.now().millisecondsSinceEpoch;
    return (now - bgTime) ~/ 1000;
  }
}
