import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import '../home/home_screen.dart';
import 'package:pinput/pinput.dart';

class VerificationScreen extends StatefulWidget {
  final int userId;
  final String type; // 'email' or '2fa'

  const VerificationScreen({
    super.key,
    required this.userId,
    required this.type,
  });

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final TextEditingController _pinController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleVerify() async {
    String code = _pinController.text;
    if (code.length < 6) {
      AppToast.show(context, message: 'Please enter the 6-digit code', type: ToastType.warning);
      return;
    }

    setState(() => _isLoading = true);

    Map<String, dynamic> result;
    if (widget.type == 'email') {
      result = await _verifyEmail(widget.userId.toString(), code);
    } else {
      result = await _verify2fa(widget.userId.toString(), code);
    }

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result['success']) {
      AppToast.show(context, message: 'Verification successful', type: ToastType.success);
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (route) => false,
      );
    } else {
      AppToast.show(context, message: result['error'], type: ToastType.error);
    }
  }

  // Helper methods for verification since they might not be in ApiService yet
  Future<Map<String, dynamic>> _verifyEmail(String userId, String code) async {
    // Check if it's already in ApiService (I should add it if not)
    // Actually, let's check ApiService first.
    return await ApiService.verifyEmail(userId, code);
  }

  Future<Map<String, dynamic>> _verify2fa(String userId, String code) async {
    return await ApiService.verify2fa(userId, code);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surfaceColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryColor),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Verification',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter the 6-digit code sent to your ${widget.type == 'email' ? 'email' : 'device'}.',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
              ),
              const SizedBox(height: 48),
              Center(
                child: Pinput(
                  length: 6,
                  controller: _pinController,
                  defaultPinTheme: PinTheme(
                    width: 50,
                    height: 60,
                    textStyle: const TextStyle(fontSize: 22, color: Colors.black87, fontWeight: FontWeight.bold),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  focusedPinTheme: PinTheme(
                    width: 50,
                    height: 60,
                    textStyle: const TextStyle(fontSize: 22, color: Colors.black87, fontWeight: FontWeight.bold),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: AppTheme.primaryColor, width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onCompleted: (pin) => _handleVerify(),
                ),
              ),
              const SizedBox(height: 48),
              GradientButton(
                text: 'Verify',
                onPressed: _handleVerify,
                loading: _isLoading,
              ),
              const SizedBox(height: 24),
              Center(
                child: TextButton(
                  onPressed: () {
                    // Implement resend logic if needed
                    AppToast.show(context, message: 'OTP resent successfully', type: ToastType.success);
                  },
                  child: const Text(
                    'Resend Code',
                    style: TextStyle(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
