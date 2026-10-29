import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import '../../core/api_cache.dart';
import 'package:pinput/pinput.dart';

class TwoFaScreen extends StatefulWidget {
  const TwoFaScreen({super.key});

  @override
  State<TwoFaScreen> createState() => _TwoFaScreenState();
}

class _TwoFaScreenState extends State<TwoFaScreen> {
  bool _loading = true;
  bool _twoFaEnabled = false;
  String? _twoFaMethod;
  String? _userEmail;
  bool _emailDisableOtpSent = false;
  bool _sendingDisableOtp = false;
  Map<String, dynamic>? _setupData;
  final _codeController = TextEditingController();
  final _disableCodeController = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _disableCodeController.dispose();
    super.dispose();
  }

  Future<void> _fetchProfile({bool force = false}) async {
    setState(() => _loading = true);
    if (force) {
      ApiCache.bust('profile');
    }
    final statusResult = await ApiService.getTwoFaStatus();
    final result = await ApiService.getProfile(forceRefresh: force);
    if (mounted) {
      setState(() {
        _loading = false;
        if (statusResult['success'] == true) {
          _twoFaEnabled = statusResult['enabled'] == true;
          _twoFaMethod = statusResult['method']?.toString();
        } else if (result['success']) {
          final user = result['user'];
          _twoFaEnabled = user['twoFaEnabled'] == true || user['twoFaEnabled'] == 1;
          _twoFaMethod = user['twoFaMethod']?.toString();
        }
        if (result['success']) {
          final user = result['user'];
          _userEmail = user['email']?.toString();
        }
      });
    }
  }

  Future<void> _sendDisableOtp([StateSetter? modalSetState]) async {
    setState(() => _sendingDisableOtp = true);
    if (modalSetState != null) modalSetState(() => _sendingDisableOtp = true);

    final result = await ApiService.sendDisableTwoFaOtp();
    if (mounted) {
      setState(() => _sendingDisableOtp = false);
      if (modalSetState != null) modalSetState(() => _sendingDisableOtp = false);

      if (result['success']) {
        setState(() => _emailDisableOtpSent = true);
        if (modalSetState != null) modalSetState(() => _emailDisableOtpSent = true);
        AppToast.show(
          context,
          message: result['message'] ?? 'Verification code sent to your email',
          type: ToastType.success,
        );
      } else {
        AppToast.show(
          context,
          message: result['error'] ?? 'Failed to send verification code',
          type: ToastType.error,
        );
      }
    }
  }

  void _copySecret() {
    final rawSecret = _setupData?['secret'] ?? _setupData?['tempToken'];
    if (rawSecret != null && rawSecret.toString().isNotEmpty) {
      final cleanSecret = rawSecret.toString().replaceAll(' ', '').trim();
      Clipboard.setData(ClipboardData(text: cleanSecret));
      AppToast.show(context, message: 'Setup key copied to clipboard!', type: ToastType.success);
    }
  }

  Future<void> _openAuthenticatorApp() async {
    final otpauthUrl = _setupData?['otpauthUrl'];
    if (otpauthUrl != null && otpauthUrl.toString().isNotEmpty) {
      try {
        final uri = Uri.parse(otpauthUrl.toString());
        final canLaunch = await canLaunchUrl(uri);
        if (canLaunch) {
          final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
          if (launched) return;
        }
      } catch (_) {}
    }
    _copySecret();
    if (mounted) {
      AppToast.show(
        context,
        message: 'Key copied. Open your Authenticator app and paste it.',
        type: ToastType.info,
      );
    }
  }

  Future<void> _startAppSetup() async {
    setState(() => _loading = true);
    final result = await ApiService.setupTwoFa();
    if (mounted) {
      setState(() {
        _loading = false;
        if (result['success']) {
          _setupData = Map<String, dynamic>.from(result['data'] ?? {});
          _setupData!['method'] = 'totp';
          _codeController.clear();
        } else {
          AppToast.show(context, message: result['error'] ?? 'Failed to setup 2FA', type: ToastType.error);
        }
      });
    }
  }

  Future<void> _startEmailSetup() async {
    setState(() => _loading = true);
    final result = await ApiService.setupTwoFaEmail();
    if (mounted) {
      setState(() {
        _loading = false;
        if (result['success']) {
          _setupData = {'method': 'email'};
          _codeController.clear();
          AppToast.show(context, message: 'A 6-digit OTP has been sent to your email', type: ToastType.success);
        } else {
          AppToast.show(context, message: result['error'] ?? 'Failed to send email OTP', type: ToastType.error);
        }
      });
    }
  }

  Future<void> _enableTwoFa() async {
    final code = _codeController.text.trim();
    if (code.length != 6) {
      AppToast.show(context, message: 'Please enter the complete 6-digit code', type: ToastType.warning);
      return;
    }
    setState(() => _submitting = true);
    final isEmail = _setupData?['method'] == 'email';
    final tokenSecret = _setupData?['tempToken'] ?? _setupData?['secret'];
    final result = await ApiService.enableTwoFa(
      code: code,
      method: isEmail ? 'email' : 'totp',
      tempToken: tokenSecret?.toString(),
    );
    if (mounted) {
      setState(() => _submitting = false);
      if (result['success']) {
        AppToast.show(context, message: 'Two-Factor Authentication enabled successfully!', type: ToastType.success);
        _codeController.clear();
        setState(() {
          _twoFaEnabled = true;
          _twoFaMethod = isEmail ? 'email' : 'totp';
          _setupData = null;
        });
        await _fetchProfile(force: true);
      } else {
        AppToast.show(context, message: result['error'] ?? 'Invalid verification code', type: ToastType.error);
      }
    }
  }

  Future<void> _disableTwoFa([BuildContext? modalContext, StateSetter? modalSetState]) async {
    final code = _disableCodeController.text.trim();
    if (code.length != 6) {
      AppToast.show(context, message: 'Please enter the 6-digit code', type: ToastType.warning);
      return;
    }
    setState(() => _submitting = true);
    if (modalSetState != null) modalSetState(() => _submitting = true);

    final result = await ApiService.disableTwoFa(code);
    if (mounted) {
      setState(() => _submitting = false);
      if (modalSetState != null) modalSetState(() => _submitting = false);

      if (result['success']) {
        if (modalContext != null && modalContext.mounted) {
          Navigator.of(modalContext).pop();
        }
        AppToast.show(context, message: 'Two-Factor Authentication disabled successfully!', type: ToastType.success);
        _disableCodeController.clear();
        setState(() {
          _twoFaEnabled = false;
          _twoFaMethod = null;
          _emailDisableOtpSent = false;
        });
        await _fetchProfile(force: true);
      } else {
        AppToast.show(context, message: result['error'] ?? 'Invalid verification code', type: ToastType.error);
      }
    }
  }

  void _showDisableBottomSheet() {
    _disableCodeController.clear();
    setState(() => _emailDisableOtpSent = false);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            final bool isEmail = _twoFaMethod == 'email';
            final defaultPinTheme = PinTheme(
              width: 46,
              height: 54,
              textStyle: TextStyle(
                fontSize: 20,
                color: context.textPrimary,
                fontWeight: FontWeight.bold,
              ),
              decoration: BoxDecoration(
                color: context.subtleBg,
                border: Border.all(color: context.borderColor),
                borderRadius: BorderRadius.circular(14),
              ),
            );

            return Container(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 16,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 28,
              ),
              decoration: BoxDecoration(
                color: context.bottomSheetBg,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 20,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Grab handle
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: context.dividerColor,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Header Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.red.shade50,
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Icon(
                                Icons.lock_open_rounded,
                                color: Colors.red.shade600,
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'Disable 2FA',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: context.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(modalContext),
                          icon: Icon(Icons.close_rounded, color: context.textSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Warning notice
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.red.withValues(alpha: 0.18)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.info_outline_rounded, color: Colors.red.shade700, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Disabling 2FA lowers account security. Withdrawals and logins will no longer require a secondary code.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.red.shade900,
                                height: 1.4,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    if (isEmail && !_emailDisableOtpSent) ...[
                      Text(
                        'To confirm disabling 2FA, a 6-digit verification code will be sent to your registered email (${_userEmail ?? 'your email'}).',
                        style: TextStyle(fontSize: 13, color: context.textSecondary, height: 1.45),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: _sendingDisableOtp ? null : () => _sendDisableOtp(setModalState),
                        icon: _sendingDisableOtp
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.send_rounded, size: 18),
                        label: Text(
                          _sendingDisableOtp ? 'Sending code...' : 'Send Verification Code',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                      ),
                    ] else ...[
                      if (isEmail && _emailDisableOtpSent) ...[
                        Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.successColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.successColor.withValues(alpha: 0.25)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, color: AppTheme.successColor, size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Code sent to ${_userEmail ?? 'your email'}',
                                  style: const TextStyle(
                                    color: AppTheme.successColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          'Enter the 6-digit code from your email to confirm:',
                          style: TextStyle(color: context.textSecondary, fontSize: 13),
                        ),
                      ] else ...[
                        Text(
                          'Enter the current 6-digit code from your Authenticator App (Google Authenticator / Authy) to confirm:',
                          style: TextStyle(color: context.textSecondary, fontSize: 13, height: 1.4),
                        ),
                      ],
                      const SizedBox(height: 16),
                      Center(
                        child: Pinput(
                          length: 6,
                          controller: _disableCodeController,
                          defaultPinTheme: defaultPinTheme,
                          focusedPinTheme: defaultPinTheme.copyDecorationWith(
                            border: Border.all(color: Colors.red.shade600, width: 2),
                          ),
                          onCompleted: (pin) => _disableTwoFa(modalContext, setModalState),
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _submitting ? null : () => _disableTwoFa(modalContext, setModalState),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red.shade600,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                        child: _submitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text(
                                'Confirm & Disable 2FA',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                      ),
                      if (isEmail) ...[
                        const SizedBox(height: 10),
                        Center(
                          child: TextButton.icon(
                            onPressed: _sendingDisableOtp ? null : () => _sendDisableOtp(setModalState),
                            icon: _sendingDisableOtp
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Icon(Icons.refresh_rounded, size: 16),
                            label: Text(
                              _sendingDisableOtp ? 'Resending...' : 'Resend Code',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Uint8List? _getQrBytes(String? dataUri) {
    if (dataUri == null || dataUri.isEmpty) return null;
    try {
      final base64String = dataUri.contains(',') ? dataUri.split(',')[1] : dataUri;
      return base64Decode(base64String.trim());
    } catch (_) {
      return null;
    }
  }

  String _formatSecret(String secret) {
    final clean = secret.replaceAll(' ', '').toUpperCase();
    final chunks = <String>[];
    for (int i = 0; i < clean.length; i += 4) {
      chunks.add(clean.substring(i, (i + 4 > clean.length) ? clean.length : i + 4));
    }
    return chunks.join(' ');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.scaffoldBg,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.only(top: 68),
                child: _loading
                    ? const Center(child: CircularProgressIndicator())
                    : SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                        child: _setupData != null
                            ? _buildSetupSection()
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _buildHeroStatusCard(),
                                  const SizedBox(height: 24),
                                  if (_twoFaEnabled)
                                    _buildActiveProtectionSection()
                                  else
                                    _buildChoiceSection(),
                                ],
                              ),
                      ),
              ),
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: FloatingScreenHeader(
                title: _setupData != null ? 'Setup 2FA' : 'Two-Factor Auth',
                onBackPressed: _setupData != null
                    ? () {
                        _codeController.clear();
                        setState(() => _setupData = null);
                      }
                    : () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroStatusCard() {
    final bool isEnabled = _twoFaEnabled;
    final bool isEmail = _twoFaMethod == 'email';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: context.borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isEnabled
                      ? AppTheme.successColor.withValues(alpha: 0.12)
                      : Colors.blueGrey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: isEnabled ? AppTheme.successColor : Colors.grey,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isEnabled ? 'Active' : 'Not Configured',
                      style: TextStyle(
                        color: isEnabled ? AppTheme.successColor : context.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              if (isEnabled)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: (isEmail ? Colors.orange : AppTheme.primaryColor).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isEmail ? 'Email' : 'Authenticator',
                    style: TextStyle(
                      color: isEmail ? Colors.orange.shade800 : AppTheme.primaryColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: isEnabled
                  ? (isEmail ? Colors.orange.withValues(alpha: 0.12) : AppTheme.primaryColor.withValues(alpha: 0.1))
                  : AppTheme.secondaryColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isEnabled
                  ? (isEmail ? Icons.mail_lock_rounded : Icons.lock_clock_rounded)
                  : Icons.lock_open_rounded,
              color: isEnabled
                  ? (isEmail ? Colors.orange.shade700 : AppTheme.primaryColor)
                  : AppTheme.secondaryColor,
              size: 34,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            isEnabled ? 'Two-Factor Authentication Active' : 'Enhance Account Security',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.bold,
              color: context.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isEnabled
                ? (isEmail
                    ? 'Your account is protected. Every login requires a 6-digit verification code sent to ${_userEmail ?? 'your registered email'}.'
                    : 'Your account is protected with Google Authenticator / Authy. A live 6-digit TOTP code is required on every login.')
                : 'Add an extra verification layer to safeguard your wallet balance, transactions, and account against unauthorized logins.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: context.textSecondary,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveProtectionSection() {
    final bool isEmail = _twoFaMethod == 'email';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Method info card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: context.borderColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: (isEmail ? Colors.orange : AppTheme.primaryColor).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      isEmail ? Icons.mail_lock_rounded : Icons.lock_clock_rounded,
                      color: isEmail ? Colors.orange : AppTheme.primaryColor,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isEmail ? 'Email Verification' : 'Authenticator App (TOTP)',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: context.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isEmail
                              ? 'Codes dispatched to ${_userEmail ?? 'your registered email'}'
                              : 'Dynamic offline codes via Google Authenticator or Authy',
                          style: TextStyle(color: context.textSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: context.subtleBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: context.borderColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PROTECTED OPERATIONS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.1,
                        color: context.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    _buildProtectedRow('Account Sign-In Authentication'),
                    const SizedBox(height: 6),
                    _buildProtectedRow('Wallet Transfers & Cashouts'),
                    const SizedBox(height: 6),
                    _buildProtectedRow('API Key & Security Configuration'),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Clean Disable Trigger Button
        OutlinedButton.icon(
          onPressed: _showDisableBottomSheet,
          icon: const Icon(Icons.lock_open_rounded, size: 18),
          label: const Text(
            'Disable Two-Factor Authentication',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.red.shade600,
            side: BorderSide(color: Colors.red.shade300),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          ),
        ),
      ],
    );
  }

  Widget _buildProtectedRow(String label) {
    return Row(
      children: [
        const Icon(Icons.check_circle_rounded, color: AppTheme.successColor, size: 16),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: context.textPrimary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildChoiceSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Text(
            'CHOOSE VERIFICATION METHOD',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
              color: context.textSecondary,
            ),
          ),
        ),
        GestureDetector(
          onTap: _startAppSetup,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: context.borderColor),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.lock_clock_rounded,
                    color: AppTheme.primaryColor,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Authenticator App',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: context.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Recommended',
                              style: TextStyle(
                                color: AppTheme.primaryColor,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Google Authenticator, Authy, or Microsoft Authenticator',
                        style: TextStyle(color: context.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.arrow_forward_ios_rounded, color: context.textSecondary, size: 16),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        GestureDetector(
          onTap: _startEmailSetup,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: context.borderColor),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.mail_lock_rounded,
                    color: Colors.orange,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Email Verification OTP',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: context.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Receive instant 6-digit codes at ${_userEmail ?? 'your email'}',
                        style: TextStyle(color: context.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.arrow_forward_ios_rounded, color: context.textSecondary, size: 16),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSetupSection() {
    final bool isEmail = _setupData?['method'] == 'email';
    final String? qrCodeDataUrl = _setupData?['qrCode'];
    final String rawSecret = (_setupData?['secret'] ?? _setupData?['tempToken'] ?? '').toString();
    final qrBytes = _getQrBytes(qrCodeDataUrl);

    final defaultPinTheme = PinTheme(
      width: 48,
      height: 56,
      textStyle: TextStyle(
        fontSize: 22,
        color: context.textPrimary,
        fontWeight: FontWeight.bold,
      ),
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border.all(color: context.borderColor),
        borderRadius: BorderRadius.circular(14),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: context.borderColor),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: (isEmail ? Colors.orange : AppTheme.primaryColor).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isEmail ? Icons.mail_lock_rounded : Icons.qr_code_2_rounded,
                      color: isEmail ? Colors.orange : AppTheme.primaryColor,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isEmail ? 'Email Verification' : 'Link Authenticator App',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: context.textPrimary,
                          ),
                        ),
                        Text(
                          isEmail
                              ? 'Enter the 6-digit code sent to ${_userEmail ?? 'your email'}'
                              : 'Scan the QR code or enter the key in Google Authenticator',
                          style: TextStyle(fontSize: 12, color: context.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              if (!isEmail) ...[
                const SizedBox(height: 20),
                Center(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.grey.shade200),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: qrBytes != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.memory(
                              qrBytes,
                              width: 170,
                              height: 170,
                              fit: BoxFit.contain,
                            ),
                          )
                        : Container(
                            width: 170,
                            height: 170,
                            color: Colors.grey.shade50,
                            child: const Center(
                              child: Icon(Icons.qr_code_2_rounded, size: 80, color: AppTheme.primaryColor),
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 20),

                if (rawSecret.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: context.subtleBg,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: context.borderColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.key_rounded, size: 15, color: context.textSecondary),
                                const SizedBox(width: 6),
                                Text(
                                  'MANUAL SETUP KEY',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.1,
                                    color: context.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              'Account: UFriends',
                              style: TextStyle(
                                fontSize: 11,
                                color: context.textSecondary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        SelectableText(
                          _formatSecret(rawSecret),
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 2.0,
                            color: context.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: _copySecret,
                                icon: const Icon(Icons.copy_rounded, size: 16),
                                label: const Text('Copy Key', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                  foregroundColor: AppTheme.primaryColor,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: _openAuthenticatorApp,
                                icon: const Icon(Icons.open_in_new_rounded, size: 16),
                                label: const Text('Open App', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.secondaryColor.withValues(alpha: 0.12),
                                  foregroundColor: AppTheme.secondaryColor,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Tip: Tap "+" in Google Authenticator or Authy, choose "Enter a setup key", and paste this key.',
                          style: TextStyle(fontSize: 11, color: context.textSecondary, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ],

              const SizedBox(height: 24),
              Text(
                'ENTER 6-DIGIT CODE',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                  color: context.textSecondary,
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Pinput(
                  length: 6,
                  controller: _codeController,
                  defaultPinTheme: defaultPinTheme,
                  focusedPinTheme: defaultPinTheme.copyDecorationWith(
                    border: Border.all(color: AppTheme.primaryColor, width: 2),
                  ),
                  onCompleted: (pin) => _enableTwoFa(),
                ),
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _enableTwoFa,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: _submitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : Text(
                          isEmail ? 'Verify & Enable Email 2FA' : 'Verify & Enable 2FA',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),

              if (isEmail) ...[
                const SizedBox(height: 12),
                Center(
                  child: TextButton.icon(
                    onPressed: _submitting ? null : () {
                      _codeController.clear();
                      _startEmailSetup();
                    },
                    icon: const Icon(Icons.refresh_rounded, size: 16, color: AppTheme.primaryColor),
                    label: const Text(
                      'Resend Code',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
