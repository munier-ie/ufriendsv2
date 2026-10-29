import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'constants.dart';
import 'custom_widgets.dart';

/// Singleton service to monitor network connectivity in real time with
/// automatic recovery polling, multi-endpoint probes, and app lifecycle hooks.
class ConnectivityService {
  ConnectivityService._();

  static final Connectivity _connectivity = Connectivity();
  static bool _isOnline = true;
  static final StreamController<bool> _controller = StreamController<bool>.broadcast();
  static Future<bool>? _inFlightCheck;
  static Timer? _recoveryTimer;
  static bool _isInitialized = false;

  /// Synchronous check if the device currently has connectivity.
  static bool get isOnline => _isOnline;

  /// Stream of network status changes (true = online, false = offline).
  static Stream<bool> get onConnectivityChanged => _controller.stream;

  /// Initialize connectivity monitoring.
  static Future<void> initialize() async {
    if (_isInitialized) return;
    _isInitialized = true;

    // Listen to OS connectivity type changes
    _connectivity.onConnectivityChanged.listen((results) async {
      final basicOnline = _checkResults(results);
      if (!basicOnline) {
        _setOnline(false);
      } else {
        await checkRealConnectivity();
      }
    });

    // Check on app resume from background (e.g. user toggled Wi-Fi / mobile data in settings)
    WidgetsBinding.instance.addObserver(_ConnectivityLifecycleObserver());

    // Initial check
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
  }

  /// Actively checks true internet reachability across multiple endpoints.
  /// Deduplicates in-flight calls so concurrent checks reuse the same probe batch.
  static Future<bool> checkRealConnectivity() {
    if (_inFlightCheck != null) {
      return _inFlightCheck!;
    }
    _inFlightCheck = _performRealConnectivityCheck().whenComplete(() {
      _inFlightCheck = null;
    });
    return _inFlightCheck!;
  }

  static Future<bool> _performRealConnectivityCheck() async {
    try {
      // 1. Basic check via connectivity_plus
      final results = await _connectivity.checkConnectivity();
      if (!_checkResults(results)) {
        _setOnline(false);
        return false;
      }
    } catch (_) {
      // If plugin fails, continue to socket probes
    }

    // 2. Multi-endpoint concurrent probes
    // Direct IP socket connections bypass DNS latency and ISP DNS cache stalls
    final futures = <Future<bool>>[
      _pingSocket('1.1.1.1', 53),
      _pingSocket('8.8.8.8', 53),
      _pingDns('google.com'),
    ];

    try {
      final serverUri = Uri.tryParse(AppConstants.baseUrl);
      final serverHost = serverUri?.host;
      if (serverHost != null &&
          serverHost.isNotEmpty &&
          serverHost != '127.0.0.1' &&
          serverHost != 'localhost') {
        final serverPort = serverUri?.port ?? (AppConstants.baseUrl.startsWith('https') ? 443 : 80);
        futures.add(_pingSocket(serverHost, serverPort));
      }
    } catch (_) {}

    final hasInternet = await _anySuccess(futures, timeout: const Duration(seconds: 4));
    _setOnline(hasInternet);
    return hasInternet;
  }

  static Future<bool> _pingSocket(String host, int port) async {
    try {
      final socket = await Socket.connect(host, port, timeout: const Duration(seconds: 3));
      socket.destroy();
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> _pingDns(String host) async {
    try {
      final result = await InternetAddress.lookup(host).timeout(const Duration(seconds: 3));
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> _anySuccess(List<Future<bool>> futures, {required Duration timeout}) async {
    final completer = Completer<bool>();
    int pending = futures.length;
    if (pending == 0) return false;

    Timer? timer;
    timer = Timer(timeout, () {
      if (!completer.isCompleted) {
        completer.complete(false);
      }
    });

    for (final future in futures) {
      future.then((success) {
        if (success && !completer.isCompleted) {
          timer?.cancel();
          completer.complete(true);
        } else {
          pending--;
          if (pending == 0 && !completer.isCompleted) {
            timer?.cancel();
            completer.complete(false);
          }
        }
      }).catchError((_) {
        pending--;
        if (pending == 0 && !completer.isCompleted) {
          timer?.cancel();
          completer.complete(false);
        }
      });
    }

    return completer.future;
  }

  /// Fast pre-flight check to prevent request attempt before triggering service execution.
  /// If flagged offline, immediately verifies if connection has been restored instead of blocking.
  static Future<bool> ensureOnline([BuildContext? context]) async {
    // Check real connectivity to allow instant recovery if network came back
    final isConnected = await checkRealConnectivity();
    if (!isConnected) {
      if (context != null && context.mounted) {
        _notifyUserOffline(context);
      }
      return false;
    }
    return true;
  }

  /// Manually mark connection as online when any valid API response is received.
  static void markOnline() {
    _setOnline(true);
  }

  static void _notifyUserOffline(BuildContext? context) {
    if (context == null) return;
    if (context.mounted) {
      AppToast.show(
        context,
        message: 'No Internet: Please check your connection',
        type: ToastType.error,
      );
    }
  }

  static void _setOnline(bool online) {
    if (online) {
      _recoveryTimer?.cancel();
      _recoveryTimer = null;
    } else {
      _startRecoveryPolling();
    }

    if (_isOnline != online) {
      _isOnline = online;
      _controller.add(online);
    }
  }

  /// Automatically poll every 3 seconds while offline so that when the user's
  /// network comes back, the app immediately detects it without requiring user intervention.
  static void _startRecoveryPolling() {
    if (_recoveryTimer != null && _recoveryTimer!.isActive) return;
    _recoveryTimer?.cancel();
    _recoveryTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (_inFlightCheck != null) return;
      final online = await checkRealConnectivity();
      if (online) {
        timer.cancel();
        _recoveryTimer = null;
      }
    });
  }

  static bool _checkResults(List<ConnectivityResult> results) {
    return results.any((r) => r != ConnectivityResult.none);
  }
}

/// Listens for app resume events to immediately verify connectivity.
class _ConnectivityLifecycleObserver with WidgetsBindingObserver {
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ConnectivityService.checkRealConnectivity();
    }
  }
}

/// Custom Exception thrown when an API request is attempted while offline.
class NoInternetException implements Exception {
  final String message;
  NoInternetException([this.message = 'No Internet: Please check your connection']);

  @override
  String toString() => message;
}
