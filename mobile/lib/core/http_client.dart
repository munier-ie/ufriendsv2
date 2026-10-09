import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as raw_http;
import 'package:shared_preferences/shared_preferences.dart';

import 'connectivity_service.dart';

const _timeout = Duration(seconds: 30);

void _checkConnectivity() {
  if (!ConnectivityService.isOnline) {
    throw NoInternetException('No Internet: Please check your connection');
  }
}

const _deviceIdKey = 'ufriends_device_id';

Future<String> _getDeviceId() async {
  final prefs = await SharedPreferences.getInstance();
  final existing = prefs.getString(_deviceIdKey);
  if (existing != null && existing.isNotEmpty) return existing;

  final random = Random.secure();
  final id = List<int>.generate(24, (_) => random.nextInt(256))
      .map((byte) => byte.toRadixString(16).padLeft(2, '0'))
      .join();
  await prefs.setString(_deviceIdKey, id);
  return id;
}

Future<Map<String, String>> _withDeviceId(Map<String, String>? headers) async {
  return {
    ...?headers,
    'X-Device-ID': await _getDeviceId(),
  };
}

Future<raw_http.Response> get(Uri url, {Map<String, String>? headers}) async {
  _checkConnectivity();
  return raw_http.get(url, headers: await _withDeviceId(headers)).timeout(_timeout);
}

Future<raw_http.Response> post(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) async {
  _checkConnectivity();
  return raw_http.post(url, headers: await _withDeviceId(headers), body: body, encoding: encoding).timeout(_timeout);
}

Future<raw_http.Response> put(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) async {
  _checkConnectivity();
  return raw_http.put(url, headers: await _withDeviceId(headers), body: body, encoding: encoding).timeout(_timeout);
}

Future<raw_http.Response> delete(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) async {
  _checkConnectivity();
  return raw_http.delete(url, headers: await _withDeviceId(headers), body: body, encoding: encoding).timeout(_timeout);
}

class MultipartRequest extends raw_http.MultipartRequest {
  MultipartRequest(super.method, super.url);

  @override
  Future<raw_http.StreamedResponse> send() async {
    _checkConnectivity();
    headers.addAll(await _withDeviceId(headers));
    return super.send().timeout(_timeout);
  }
}

typedef MultipartFile = raw_http.MultipartFile;
typedef Response = raw_http.Response;
