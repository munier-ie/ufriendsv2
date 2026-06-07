import 'package:http/http.dart' as rawHttp;
import 'dart:async';
import 'dart:convert';

const _timeout = Duration(seconds: 30);

Future<rawHttp.Response> get(Uri url, {Map<String, String>? headers}) {
  return rawHttp.get(url, headers: headers).timeout(_timeout);
}

Future<rawHttp.Response> post(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) {
  return rawHttp.post(url, headers: headers, body: body, encoding: encoding).timeout(_timeout);
}

Future<rawHttp.Response> put(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) {
  return rawHttp.put(url, headers: headers, body: body, encoding: encoding).timeout(_timeout);
}

Future<rawHttp.Response> delete(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) {
  return rawHttp.delete(url, headers: headers, body: body, encoding: encoding).timeout(_timeout);
}

class MultipartRequest extends rawHttp.MultipartRequest {
  MultipartRequest(super.method, super.url);

  @override
  Future<rawHttp.StreamedResponse> send() {
    return super.send().timeout(_timeout);
  }
}

typedef MultipartFile = rawHttp.MultipartFile;
typedef Response = rawHttp.Response;
