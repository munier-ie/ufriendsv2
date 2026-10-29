import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import '../home/home_screen.dart';
import 'package:pinput/pinput.dart';

class VerificationScreen extends StatefulWidget {
  final int userId;
  final String type; // 'email' or '2fa'
  final String? twoFaMethod; // 'totp' or 'email'

  const VerificationScreen({
    super.key,
    required this.userId,
    required this.type,
    this.twoFaMethod,
  });

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  final TextEditingController _pinController = TextEditingController();
  late String _type;
  late String? _twoFaMethod;
  bool _isLoading = false;
  bool _isResending = false;

  @override
  void initState() {
    super.initState();
    _type = widget.type;
    _twoFaMethod = widget.twoFaMethod;
  }

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _handleVerify() async {
    String code = _pinController.text.trim();
    if (code.length < 6) {
      AppToast.show(
        context,
        message: 'Please enter the complete 6-digit code',
        type: ToastType.warning,
      );
      return;
    }

    setState(() => _isLoading = true);

    Map<String, dynamic> result;
    if (_type == 'email') {
      result = await _verifyEmail(widget.userId.toString(), code);
    } else {
      result = await _verify2fa(widget.userId.toString(), code);
    }

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result['success']) {
      if (result['data']?['twoFaRequired'] == true) {
        final nextMethod = result['data']?['twoFaMethod'] ?? 'totp';
        setState(() {
          _type = '2fa';
          _twoFaMethod = nextMethod;
          _pinController.clear();
        });
        AppToast.show(
          context,
          message: nextMethod == 'email'
              ? 'Email verified! Enter the 2FA code sent to your email.'
              : 'Email verified! Enter the code from your Authenticator app.',
          type: ToastType.info,
        );
        return;
      }

      AppToast.show(
        context,
        message: 'Verification successful',
        type: ToastType.success,
      );
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
        (route) => false,
      );
    } else {
      AppToast.show(context, message: result['error'] ?? 'Verification failed', type: ToastType.error);
    }
  }

  Future<Map<String, dynamic>> _verifyEmail(String userId, String code) async {
    return await ApiService.verifyEmail(userId, code);
  }

  Future<Map<String, dynamic>> _verify2fa(String userId, String code) async {
    return await ApiService.verify2fa(userId, code);
  }

  Future<void> _handleResend() async {
    if (_isResending) return;
    setState(() => _isResending = true);

    final Map<String, dynamic> result;
    if (_type == 'email') {
      result = await ApiService.resendVerification(widget.userId);
    } else if (_type == '2fa' && _twoFaMethod == 'email') {
      result = await ApiService.resend2Fa(widget.userId);
    } else {
      setState(() => _isResending = false);
      return;
    }

    if (!mounted) return;
    setState(() => _isResending = false);
    AppToast.show(
      context,
      message: result['success']
          ? (result['message'] ?? 'A new verification code has been sent.')
          : (result['error'] ?? 'Could not resend the code.'),
      type: result['success'] ? ToastType.success : ToastType.error,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool is2Fa = _type == '2fa';
    final bool isTotp = is2Fa && (_twoFaMethod == null || _twoFaMethod == 'totp');
    final bool canResend = _type == 'email' || (is2Fa && _twoFaMethod == 'email');

    String title;
    String subtitle;
    IconData headerIcon;
    Color iconColor;

    if (!is2Fa) {
      title = 'Verify Your Email';
      subtitle = 'Enter the 6-digit confirmation code sent to your email address.';
      headerIcon = Icons.mark_email_read_rounded;
      iconColor = AppTheme.primaryColor;
    } else if (_twoFaMethod == 'email') {
      title = 'Email 2FA Verification';
      subtitle = 'Enter the 6-digit security code sent to your registered email.';
      headerIcon = Icons.mail_lock_rounded;
      iconColor = Colors.orange.shade700;
    } else {
      title = 'Authenticator 2FA';
      subtitle = 'Enter the 6-digit code currently displayed in your Authenticator app (e.g. Google Authenticator, Authy).';
      headerIcon = Icons.lock_clock_rounded;
      iconColor = AppTheme.primaryColor;
    }

    return Scaffold(
      backgroundColor: context.surfaceColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new,
            color: AppTheme.primaryColor,
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Icon(headerIcon, color: iconColor, size: 28),
              ),
              const SizedBox(height: 20),
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                subtitle,
                style: TextStyle(
                  color: context.textSecondary,
                  fontSize: 15,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 40),
              Center(
                child: Pinput(
                  length: 6,
                  controller: _pinController,
                  defaultPinTheme: PinTheme(
                    width: 50,
                    height: 60,
                    textStyle: TextStyle(
                      fontSize: 22,
                      color: context.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                    decoration: BoxDecoration(
                      color: context.cardColor,
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  focusedPinTheme: PinTheme(
                    width: 50,
                    height: 60,
                    textStyle: TextStyle(
                      fontSize: 22,
                      color: context.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                    decoration: BoxDecoration(
                      color: context.cardColor,
                      border: Border.all(
                        color: AppTheme.primaryColor,
                        width: 2,
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onCompleted: (pin) => _handleVerify(),
                ),
              ),
              const SizedBox(height: 36),
              GradientButton(
                text: isTotp ? 'Verify Authenticator Code' : 'Verify Code',
                onPressed: _handleVerify,
                loading: _isLoading,
              ),
              const SizedBox(height: 24),
              if (canResend) ...[
                Center(
                  child: TextButton.icon(
                    onPressed: _isResending ? null : _handleResend,
                    icon: _isResending
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh_rounded, size: 16),
                    label: Text(
                      _isResending ? 'Sending new code...' : 'Resend Code',
                      style: const TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ] else ...[
                Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.lock_clock_rounded, size: 15, color: context.textSecondary),
                      const SizedBox(width: 6),
                      Text(
                        'Codes refresh every 30s in your Authenticator app',
                        style: TextStyle(
                          color: context.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
