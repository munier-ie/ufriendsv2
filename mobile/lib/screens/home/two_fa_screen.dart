import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';

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
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Custom Header
            Container(
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 1.5),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 15, offset: const Offset(0, 4)),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF1E90FF), size: 20),
                        onPressed: () {
                          if (_setupData != null && !_twoFaEnabled) {
                            setState(() => _setupData = null); // Go back to choice
                          } else {
                            Navigator.pop(context);
                          }
                        },
                      ),
                      const Spacer(),
                      const Text(
                        'Two-Factor Auth',
                        style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const Spacer(),
                      const SizedBox(width: 48),
                    ],
                  ),
                ),
              ),
            ),
            
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
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
                          else if (_setupData != null)
                            _buildSetupSection()
                          else
                            _buildChoiceSection(),
                        ],
                      ),
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
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade200),
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
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade200),
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
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 15, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          if (isEmail) ...[
            const Icon(Icons.mark_email_read, size: 48, color: Colors.orange),
            const SizedBox(height: 16),
            const Text('Enter the code sent to your email to enable 2FA.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
          ] else ...[
            const Text('Scan this QR code with your Authenticator App', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            if (qrCodeDataUrl != null)
              Container(
                padding: const EdgeInsets.all(16),
                color: Colors.white,
                // Fallback since decoding base64 image data url in Flutter requires some string manipulation
                child: Image.network(qrCodeDataUrl, height: 200, width: 200, errorBuilder: (_,__,___) => const Icon(Icons.qr_code, size: 100)),
              ),
            const SizedBox(height: 16),
            if (_setupData!['secret'] != null) ...[
              const Text('Or enter this code manually:', style: TextStyle(color: Colors.grey, fontSize: 12)),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _copySecret,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
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
            ],
          ],
          const SizedBox(height: 32),
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
              fillColor: Colors.grey.shade50,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
          ),
          const SizedBox(height: 24),
          GradientButton(
            text: 'Verify & Enable',
            loading: _submitting,
            onPressed: () => _enableTwoFa(),
          ),
        ],
      ),
    );
  }

  Widget _buildDisableSection() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100),
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
              fillColor: Colors.grey.shade50,
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
