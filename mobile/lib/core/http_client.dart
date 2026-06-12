import 'package:http/http.dart' as raw_http;
import 'dart:async';
import 'dart:convert';

const _timeout = Duration(seconds: 30);

Future<raw_http.Response> get(Uri url, {Map<String, String>? headers}) {
  return raw_http.get(url, headers: headers).timeout(_timeout);
}

Future<raw_http.Response> post(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) {
  return raw_http.post(url, headers: headers, body: body, encoding: encoding).timeout(_timeout);
}

Future<raw_http.Response> put(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) {
  return raw_http.put(url, headers: headers, body: body, encoding: encoding).timeout(_timeout);
}

Future<raw_http.Response> delete(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) {
  return raw_http.delete(url, headers: headers, body: body, encoding: encoding).timeout(_timeout);
}

class MultipartRequest extends raw_http.MultipartRequest {
  MultipartRequest(super.method, super.url);

  @override
  Future<raw_http.StreamedResponse> send() {
    return super.send().timeout(_timeout);
  }
}

typedef MultipartFile = raw_http.MultipartFile;
typedef Response = raw_http.Response;
