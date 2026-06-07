import 'dart:convert';
import 'package:http/http.dart' as http;
import 'constants.dart';
import 'auth_service.dart';
import '../main.dart';
import '../screens/auth/login_screen.dart';
import 'package:flutter/material.dart';

class ApiService {
  static bool _handleAuthError(http.Response response) {
    if (response.statusCode == 401) {
      AuthService.logout();
      navigatorKey.currentState?.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
      return true;
    }
    return false;
  }
  static Future<Map<String, dynamic>> login(String phone, String password) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.loginEndpoint}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phone,
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        if (data['token'] != null) {
          await AuthService.saveToken(data['token']);
          return {'success': true, 'data': data};
        } else if (data['emailVerificationRequired'] == true || data['twoFaRequired'] == true) {
          return {
            'success': false, 
            'error': data['message'] ?? 'Verification required',
            'verificationRequired': true,
            'type': data['emailVerificationRequired'] == true ? 'email' : '2fa',
            'userId': data['userId']
          };
        }
      }
      
      return {'success': false, 'error': data['error'] ?? 'Login failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error. Please check your connection.'};
    }
  }

  static Future<Map<String, dynamic>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    required String password,
    required String pin,
    String? state,
    String? referral,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}${AppConstants.registerEndpoint}'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
          'phone': phone,
          'password': password,
          'pin': pin,
          'state': state,
          'referral': referral,
          'type': 1,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true, 'data': data};
      } else {
        String error = data['error'] ?? 'Registration failed';
        if (data['details'] != null) {
          error += ': ${data['details']}';
        }
        return {'success': false, 'error': error};
      }
    } catch (e) {
      return {'success': false, 'error': 'Network error. Please check your connection.'};
    }
  }

  static Future<Map<String, dynamic>> verifyEmail(String userId, String code) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/auth/verify-email'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': int.tryParse(userId),
          'code': code,
        }),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        if (data['token'] != null) {
          await AuthService.saveToken(data['token']);
        }
        return {'success': true, 'data': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Verification failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> verify2fa(String userId, String code) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/auth/verify-2fa'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': int.tryParse(userId),
          'code': code,
        }),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        if (data['token'] != null) {
          await AuthService.saveToken(data['token']);
        }
        return {'success': true, 'data': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Verification failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> verifyNin(String nin) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/kyc/verify-nin'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'nin': nin}),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'NIN Verification failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> verifyBvn(String bvn) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/kyc/verify-bvn'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'bvn': bvn}),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'BVN Verification failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> forgotPasswordOtp(String email) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/auth/forgot-password-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to send OTP'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> resetPasswordOtp(String email, String otp, String newPassword) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/auth/reset-password-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'otp': otp,
          'newPassword': newPassword,
        }),
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to reset password'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> getProfile() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/auth/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'user': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch profile'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> getTransactions({int limit = 50, String? type}) async {
    try {
      final token = await AuthService.getToken();
      String url = '${AppConstants.baseUrl}/wallet/transactions?limit=$limit';
      if (type != null) {
        url += '&type=$type';
      }
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'transactions': data['transactions']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch transactions'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> getWalletStats() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/wallet/stats'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'stats': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch stats'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> getChartData(String period) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/wallet/stats/chart?period=$period'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'chartData': data['chartData'], 'daysCount': data['daysCount']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch chart data'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static final Map<String, dynamic> _cache = {};
  static final Map<String, DateTime> _cacheTime = {};

  static Future<Map<String, dynamic>> getServices(String type) async {
    final cacheKey = 'services_$type';
    if (_cache.containsKey(cacheKey) && 
        _cacheTime[cacheKey]!.isAfter(DateTime.now().subtract(const Duration(minutes: 5)))) {
      return {'success': true, 'services': _cache[cacheKey]};
    }

    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/services/$type'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        _cache[cacheKey] = data['services'];
        _cacheTime[cacheKey] = DateTime.now();
        return {'success': true, 'services': data['services']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch services'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> getVirtualAccounts() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/virtual-accounts/my-accounts'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {
          'success': true, 
          'accounts': data['accounts'],
          'kycStatus': data['kycStatus']
        };
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch accounts'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> createVirtualAccount() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/virtual-accounts/create-paymentpoint'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200 && data['success'] == true) {
        return {'success': true, 'account': data['account']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to create account'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> verifyUtility({
    required String type, // 'cable' or 'electricity'
    required String provider, // 'dstv', 'gotv', etc.
    required String number, // IUC or Meter number
    String? meterType,
  }) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/services/verify'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'type': type,
          'provider': provider,
          'number': number,
          if (meterType != null) 'meterType': meterType,
        }),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Verification failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> purchaseService({
    required String serviceId,
    required String recipient,
    required double amount,
    required String pin,
    String? networkType,
    String? iucNumber,
    String? subscriptionType,
    String? accessToken,
    String? meterNumber,
    String? meterType,
  }) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/services/purchase'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'serviceId': int.tryParse(serviceId) ?? 0,
          'recipient': recipient,
          'amount': amount,
          'pin': pin,
          if (networkType != null) 'networkType': networkType,
          if (iucNumber != null) 'iucNumber': iucNumber,
          if (subscriptionType != null) 'subscriptionType': subscriptionType,
          if (accessToken != null) 'accessToken': accessToken,
          if (meterNumber != null) 'meterNumber': meterNumber,
          if (meterType != null) 'meterType': meterType,
        }),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Purchase failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> forgotPin() async {
    final token = await AuthService.getToken();
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/auth/pin/forgot'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to send OTP'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> resetPinWithOtp({
    required String otp,
    required String newPin,
    required String confirmPin,
  }) async {
    final token = await AuthService.getToken();
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/auth/pin/reset-with-otp'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'otp': otp,
          'newPin': newPin,
          'confirmPin': confirmPin,
        }),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to reset PIN'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> updatePin({
    String? currentPin,
    required String newPin,
  }) async {
    final token = await AuthService.getToken();
    try {
      final response = await http.put(
        Uri.parse('${AppConstants.baseUrl}/user/pin'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'currentPin': currentPin,
          'newPin': newPin,
        }..removeWhere((key, value) => value == null)),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to update PIN'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> getNotifications() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/notifications'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'notifications': data['notifications']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch notifications'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> markNotificationsRead() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/notifications/mark-read'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to mark notifications as read'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> deleteNotification(String id) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.delete(
        Uri.parse('${AppConstants.baseUrl}/notifications/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to delete notification'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }
  static Future<Map<String, dynamic>> generateAirtimeToCashOTP(String network, String phoneNumber) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/airtime-cash/generate-otp'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'network': network,
          'phoneNumber': phoneNumber,
        }),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to generate OTP'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> verifyAirtimeToCashOTP(String network, String phoneNumber, String otp) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/airtime-cash/verify-otp'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'network': network,
          'phoneNumber': phoneNumber,
          'otp': otp,
        }),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to verify OTP'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> requestAirtimeToCash({
    required String network,
    required double amount,
    required String phoneNumber,
    required String pin,
    required String transferPin,
    required String sessionId,
  }) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/airtime-cash/request'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'network': network,
          'amount': amount,
          'phoneNumber': phoneNumber,
          'pin': pin,
          'transferPin': transferPin,
          'sessionId': sessionId,
        }),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {'success': true, 'data': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Request failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }
  static Future<Map<String, dynamic>> getPinsServices() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/pins/services'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'services': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch pins services'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> purchasePins({
    required String serviceId,
    required int quantity,
    required double amount,
    required String pin,
    String? businessName,
  }) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/pins/purchase'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'serviceId': int.tryParse(serviceId) ?? 0,
          'quantity': quantity,
          'amount': amount,
          'pin': pin,
          'businessName': businessName,
        }..removeWhere((key, value) => value == null)),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200) {
        return {'success': true, 'data': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Purchase failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> purchaseRechargeCards({
    required String network,
    required int denomination,
    required int quantity,
    required String name,
    required String pin,
  }) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/recharge-cards/purchase'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'network': network,
          'denomination': denomination,
          'quantity': quantity,
          'name': name,
          'pin': pin,
        }),
      );
      final data = jsonDecode(response.body);
      if (_handleAuthError(response)) {
        return {'success': false, 'error': 'Session expired. Please log in again.'};
      }
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'pins': data['pins']};
      }
      return {'success': false, 'error': data['error'] ?? 'Purchase failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  // ─── Government / Professional Services ─────────────────────────────────────

  static Future<Map<String, dynamic>> getBvnPricing() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/bvn/pricing'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch BVN pricing'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> getNinPricing() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/nin/pricing'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch NIN pricing'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> submitProfessionalRequest({
    required String type,
    required Map<String, dynamic> details,
    required String pin,
  }) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/professional/request'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'type': type, 'details': details, 'pin': pin}),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'report': data['report'], 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Request failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }
  static Future<Map<String, dynamic>> fetchCacPricing() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/professional/cac-pricing'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch CAC pricing'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> fetchCacHistory() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/professional/cac-history'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data['registrations']};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch CAC history'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> submitCacRegistration({
    required Map<String, String> fields,
    required String pin,
    required String directorIdCardPath,
    required String passportPhotoPath,
  }) async {
    try {
      final token = await AuthService.getToken();
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConstants.baseUrl}/professional/cac-register'),
      );
      
      request.headers['Authorization'] = 'Bearer $token';
      
      // Add text fields
      fields.forEach((key, value) {
        request.fields[key] = value;
      });
      request.fields['pin'] = pin;
      
      // Add files
      request.files.add(await http.MultipartFile.fromPath('directorIdCard', directorIdCardPath));
      request.files.add(await http.MultipartFile.fromPath('passportPhoto', passportPhotoPath));
      
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Registration failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── Manual Services (NIN/BVN Professional Services) ──

  static Future<Map<String, dynamic>> fetchManualServicePricing() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/manual-services/pricing'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch pricing'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> fetchManualServiceHistory() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/manual-services/history'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data['requests'] ?? []};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch history'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> submitManualService({
    required String serviceType,
    String? subType,
    required Map<String, dynamic> details,
    required String pin,
  }) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/manual-services/submit'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'serviceType': serviceType,
          'subType': subType,
          'details': details,
          'pin': pin,
        }),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message'] ?? 'Request submitted', 'bvn': data['bvn']};
      }
      return {'success': false, 'error': data['error'] ?? 'Submission failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> uploadIdDocument(String filePath) async {
    try {
      final token = await AuthService.getToken();
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${AppConstants.baseUrl}/manual-services/upload-id'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.files.add(await http.MultipartFile.fromPath('file', filePath));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'filePath': data['filePath']};
      }
      return {'success': false, 'error': data['error'] ?? 'Upload failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── Academy ──

  static Future<Map<String, dynamic>> fetchAcademyContent() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academy'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to load academy content'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> fetchAcademyItem(String id) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/academy/$id'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to load content details'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> purchaseAcademyContent(String id, String pin) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/academy/$id/purchase'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'transactionPin': pin}),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'message': data['message']};
      return {'success': false, 'error': data['error'] ?? 'Purchase failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── Account Upgrade ──

  static Future<Map<String, dynamic>> fetchUpgradePlans() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/user/upgrade-plans'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch upgrade plans'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> upgradeAccount(int targetType) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/user/upgrade'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'targetType': targetType}),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'message': data['message']};
      return {'success': false, 'error': data['error'] ?? 'Upgrade failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── Support ──

  static Future<Map<String, dynamic>> getSupportMessages() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/user/support'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'messages': data['messages'] ?? []};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch messages'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> createSupportMessage({required String subject, required String message}) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/user/support'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'subject': subject, 'message': message}),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) return {'success': true, 'data': data['data']};
      return {'success': false, 'error': data['error'] ?? 'Failed to send message'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── Pricing ──

  static Future<Map<String, dynamic>> getPricingServices() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/services/all'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'services': data['services'] ?? []};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch services'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── Referrals ──

  static Future<Map<String, dynamic>> getReferralStats() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/referrals/stats'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch stats'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> withdrawReferralCommission([String? amount]) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/referrals/withdraw'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(amount != null && amount.isNotEmpty ? {'amount': amount} : {}),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'message': data['message']};
      return {'success': false, 'error': data['error'] ?? 'Withdrawal failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── Profile Settings ──

  static Future<Map<String, dynamic>> updatePassword(String currentPassword, String newPassword) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.put(
        Uri.parse('${AppConstants.baseUrl}/auth/update-password'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode({'currentPassword': currentPassword, 'newPassword': newPassword}),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'message': data['message']};
      return {'success': false, 'error': data['error'] ?? 'Password update failed'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── 2FA ──

  static Future<Map<String, dynamic>> setupTwoFa() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/twofa/setup'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'data': data};
      return {'success': false, 'error': data['error'] ?? 'Failed to setup 2FA'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> setupTwoFaEmail() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/twofa/setup-email'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'message': data['message']};
      return {'success': false, 'error': data['error'] ?? 'Failed to setup email 2FA'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> enableTwoFa({required String code, required String method, String? tempToken}) async {
    try {
      final token = await AuthService.getToken();
      final body = {'code': code, 'method': method};
      if (tempToken != null) {
        body['tempToken'] = tempToken;
      }
      
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/twofa/enable'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode(body),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'message': data['message']};
      return {'success': false, 'error': data['error'] ?? 'Failed to enable 2FA'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  static Future<Map<String, dynamic>> disableTwoFa(String code) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/twofa/disable'),
        headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
        body: jsonEncode({'code': code}),
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'message': data['message']};
      return {'success': false, 'error': data['error'] ?? 'Failed to disable 2FA'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }

  // ── Developer API Keys ──

  static Future<Map<String, dynamic>> generateApiKey() async {
    try {
      final token = await AuthService.getToken();
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/auth/generate-api-key'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (_handleAuthError(response)) return {'success': false, 'error': 'Session expired'};
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) return {'success': true, 'apiKey': data['apiKey']};
      return {'success': false, 'error': data['error'] ?? 'Failed to generate API Key'};
    } catch (e) {
      return {'success': false, 'error': 'Network error'};
    }
  }
}
