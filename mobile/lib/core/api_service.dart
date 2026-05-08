import 'dart:convert';
import 'package:http/http.dart' as http;
import 'constants.dart';
import 'auth_service.dart';

class ApiService {
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

      if (response.statusCode == 200 && data['token'] != null) {
        await AuthService.saveToken(data['token']);
        return {'success': true, 'data': data};
      } else {
        return {'success': false, 'error': data['error'] ?? 'Login failed'};
      }
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
        return {'success': false, 'error': data['error'] ?? 'Registration failed'};
      }
    } catch (e) {
      return {'success': false, 'error': 'Network error. Please check your connection.'};
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
      if (response.statusCode == 200) {
        return {'success': true, 'user': data};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch profile'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }

  static Future<Map<String, dynamic>> getTransactions({int limit = 5}) async {
    try {
      final token = await AuthService.getToken();
      final response = await http.get(
        Uri.parse('${AppConstants.baseUrl}/wallet/transactions?limit=$limit'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {'success': true, 'transactions': data['transactions']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to fetch transactions'};
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
      if (response.statusCode == 200 && data['success'] == true) {
        return {'success': true, 'account': data['account']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to create account'};
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
          'networkType': networkType,
        }),
      );
      final data = jsonDecode(response.body);
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
      if (response.statusCode == 200) {
        return {'success': true, 'message': data['message']};
      }
      return {'success': false, 'error': data['error'] ?? 'Failed to update PIN'};
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    }
  }
}
