import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'package:pinput/pinput.dart';

class TwoFaScreen extends StatefulWidget {
  const TwoFaScreen({super.key});

  @override
  State<TwoFaScreen> createState() => _TwoFaScreenState();
}

class _TwoFaScreenState extends State<TwoFaScreen> {
  bool _loading = true;
  bool _twoFaEnabled = false;
  Map<String, dynamic>? _setupData;
  final _codeController = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() => _loading = true);
    final result = await ApiService.getProfile();
    if (mounted) {
      setState(() {
        _loading = false;
        if (result['success']) {
          final user = result['user'];
          _twoFaEnabled = user['twoFaEnabled'] == true || user['twoFaEnabled'] == 1;
        }
      });
    }
  }

  void _copySecret() {
    if (_setupData != null && _setupData!['secret'] != null) {
      Clipboard.setData(ClipboardData(text: _setupData!['secret']));
      AppToast.show(context, message: 'Secret copied to clipboard', type: ToastType.success);
    }
  }

  Future<void> _startAppSetup() async {
    setState(() => _loading = true);
    final result = await ApiService.setupTwoFa();
    if (mounted) {
      setState(() {
        _loading = false;
        if (result['success']) {
          _setupData = result['data'];
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
          AppToast.show(context, message: 'An OTP has been sent to your email', type: ToastType.success);
        } else {
          AppToast.show(context, message: result['error'] ?? 'Failed to send email OTP', type: ToastType.error);
        }
      });
    }
  }

  Future<void> _enableTwoFa() async {
    if (_codeController.text.trim().isEmpty) {
      AppToast.show(context, message: 'Please enter the code', type: ToastType.warning);
      return;
    }
    setState(() => _submitting = true);
    final result = await ApiService.enableTwoFa(
      code: _codeController.text.trim(),
      method: _setupData!['method'] == 'email' ? 'email' : 'totp',
      tempToken: _setupData!['tempToken'],
    );
    if (mounted) {
      setState(() => _submitting = false);
      if (result['success']) {
        AppToast.show(context, message: 'Two-Factor Authentication Enabled successfully!', type: ToastType.success);
        _codeController.clear();
        _setupData = null;
        _fetchProfile();
      } else {
        AppToast.show(context, message: result['error'] ?? 'Invalid code', type: ToastType.error);
      }
    }
  }

  Future<void> _disableTwoFa() async {
    if (_codeController.text.trim().isEmpty) {
      AppToast.show(context, message: 'Please enter the code', type: ToastType.warning);
      return;
    }
    setState(() => _submitting = true);
    final result = await ApiService.disableTwoFa(_codeController.text.trim());
    if (mounted) {
      setState(() => _submitting = false);
      if (result['success']) {
        AppToast.show(context, message: 'Two-Factor Authentication Disabled successfully!', type: ToastType.success);
        _codeController.clear();
        _fetchProfile();
      } else {
        AppToast.show(context, message: result['error'] ?? 'Invalid code', type: ToastType.error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.cardColor,
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
                        padding: const EdgeInsets.all(24),
                        child: _setupData != null 
                          ? _buildSetupSection()
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Icon(
                                  _twoFaEnabled ? Icons.security : Icons.shield_outlined,
                                  size: 80,
                                  color: _twoFaEnabled ? Colors.green : Colors.grey,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  _twoFaEnabled ? '2FA is Enabled' : '2FA is Disabled',
                                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _twoFaEnabled 
                                      ? 'Your account is currently protected with two-factor authentication.' 
                                      : 'Enable two-factor authentication to add an extra layer of security to your account.',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: Colors.grey),
                                ),
                                const SizedBox(height: 32),
                                
                                if (_twoFaEnabled)
                                  _buildDisableSection()
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
                    ? () => setState(() => _setupData = null)
                    : () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChoiceSection() {
    return Column(
      children: [
        GestureDetector(
          onTap: _startAppSetup,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: context.borderColor),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppTheme.primaryColor.withValues(alpha: 0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.qr_code_scanner, color: AppTheme.primaryColor),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Authenticator App', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      SizedBox(height: 4),
                      Text('Use Google Authenticator or Authy', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: _startEmailSetup,
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: context.borderColor),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.email_outlined, color: Colors.orange),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Email Verification', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      SizedBox(height: 4),
                      Text('Receive codes via your registered email', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSetupSection() {
    final isEmail = _setupData!['method'] == 'email';
    final qrCodeDataUrl = _setupData!['qrCode'];
    
    final defaultPinTheme = PinTheme(
      width: 50,
      height: 60,
      textStyle: TextStyle(fontSize: 22, color: context.textPrimary, fontWeight: FontWeight.bold),
      decoration: BoxDecoration(
        color: context.cardColor,
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(12),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 12),
        const Text(
          'Verification',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Color(0xFF003B73),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          isEmail 
              ? 'Enter the 6-digit code sent to your email.'
              : 'Enter the 6-digit code from your Authenticator App.',
          style: const TextStyle(fontSize: 16, color: Colors.grey),
        ),
        const SizedBox(height: 48),
        
        if (!isEmail && qrCodeDataUrl != null) ...[
          Center(
            child: Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: Image.network(qrCodeDataUrl, height: 150, width: 150, errorBuilder: (_,_,_) => const Icon(Icons.qr_code, size: 100)),
            ),
          ),
          const SizedBox(height: 16),
          if (_setupData!['secret'] != null)
            Center(
              child: GestureDetector(
                onTap: _copySecret,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(color: context.dividerColor, borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_setupData!['secret'], style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
                      const SizedBox(width: 12),
                      const Icon(Icons.copy, size: 16, color: Colors.grey),
                    ],
                  ),
                ),
              ),
            ),
          const SizedBox(height: 32),
        ],

        Center(
          child: Pinput(
            length: 6,
            controller: _codeController,
            defaultPinTheme: defaultPinTheme,
            focusedPinTheme: defaultPinTheme.copyDecorationWith(
              border: Border.all(color: const Color(0xFF1E90FF), width: 2),
            ),
            onCompleted: (pin) => _enableTwoFa(),
          ),
        ),
        const SizedBox(height: 48),
        
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: _submitting ? null : _enableTwoFa,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E90FF),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              elevation: 4,
            ),
            child: _submitting
                ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Verify', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 16),
        
        if (isEmail)
          Center(
            child: TextButton(
              onPressed: () {
                _codeController.clear();
                _startEmailSetup();
              },
              child: const Text(
                'Resend Code',
                style: TextStyle(color: Color(0xFF003B73), fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildDisableSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: context.dividerColor),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 15, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          const Text('Enter your 2FA code to disable protection.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 24),
          TextField(
            controller: _codeController,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
            maxLength: 6,
            decoration: InputDecoration(
              counterText: '',
              hintText: '000000',
              filled: true,
              fillColor: context.subtleBg,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _submitting ? null : _disableTwoFa,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade50,
                foregroundColor: Colors.red.shade600,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: _submitting
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.red, strokeWidth: 2))
                  : const Text('Disable 2FA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}
