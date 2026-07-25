import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'custom_widgets.dart';

/// Singleton service to monitor network connectivity in real time.
class ConnectivityService {
  ConnectivityService._();

  static final Connectivity _connectivity = Connectivity();
  static bool _isOnline = true;
  static final StreamController<bool> _controller = StreamController<bool>.broadcast();

  /// Synchronous check if the device currently has connectivity.
  static bool get isOnline => _isOnline;

  /// Stream of network status changes (true = online, false = offline).
  static Stream<bool> get onConnectivityChanged => _controller.stream;

  /// Initialize connectivity monitoring.
  static Future<void> initialize() async {
    try {
      final results = await _connectivity.checkConnectivity();
      final basicOnline = _checkResults(results);
      if (!basicOnline) {
        _setOnline(false);
      } else {
        await checkRealConnectivity();
      }
    } catch (_) {
      _setOnline(true);
    }

    _connectivity.onConnectivityChanged.listen((results) async {
      final basicOnline = _checkResults(results);
      if (!basicOnline) {
        _setOnline(false);
      } else {
        await checkRealConnectivity();
      }
    });
  }

  /// Actively pings a reliable endpoint to verify true internet reachability.
  static Future<bool> checkRealConnectivity() async {
    try {
      final result = await InternetAddress.lookup('google.com').timeout(const Duration(seconds: 3));
      final hasInternet = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
      _setOnline(hasInternet);
      return hasInternet;
    } catch (_) {
      _setOnline(false);
      return false;
    }
  }

  /// Fast pre-flight check to prevent request attempt before triggering service execution.
  static Future<bool> ensureOnline([BuildContext? context]) async {
    if (!_isOnline) {
      _notifyUserOffline(context);
      return false;
    }
    final realOnline = await checkRealConnectivity();
    if (!realOnline) {
      // ignore: use_build_context_synchronously
      _notifyUserOffline(context);
      return false;
    }
    return true;
  }

  static void _notifyUserOffline(BuildContext? context) {
    if (context == null) return;
    // ignore: use_build_context_synchronously
    if (context.mounted) {
      AppToast.show(
        context,
        message: 'No Internet: Please check your connection',
        type: ToastType.error,
      );
    }
  }

  static void _setOnline(bool online) {
    if (_isOnline != online) {
      _isOnline = online;
      _controller.add(online);
    }
  }

  static bool _checkResults(List<ConnectivityResult> results) {
    return results.any((r) => r != ConnectivityResult.none);
  }
}

/// Custom Exception thrown when an API request is attempted while offline.
class NoInternetException implements Exception {
  final String message;
  NoInternetException([this.message = 'No Internet: Please check your connection']);

  @override
  String toString() => message;
}
