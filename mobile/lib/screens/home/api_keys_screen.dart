import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'upgrade_screen.dart';
import 'pin_screen.dart';

class ApiKeysScreen extends StatefulWidget {
  const ApiKeysScreen({super.key});

  @override
  State<ApiKeysScreen> createState() => _ApiKeysScreenState();
}

class _ApiKeysScreenState extends State<ApiKeysScreen> {
  bool _loading = true;
  Map<String, dynamic>? _user;
  final bool _generating = false;
  bool _showKey = false;

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
          _user = result['user'];
        }
      });
    }
  }

  Future<void> _generateKey() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          onVerify: (pin) async {
            return await ApiService.generateApiKey(pin);
          },
        ),
      ),
    );

    if (result != null) {
      if (!mounted) return;
      
      final bool isSuccess = result is Map ? result['success'] == true : (result == true);
      final String errorMessage = result is Map ? (result['error'] ?? 'Failed to generate API Key') : 'Failed to generate API Key';

      if (isSuccess) {
        AppToast.show(context, message: 'API Key generated successfully!', type: ToastType.success);
        _fetchProfile(); // refresh to get new key
      } else {
        AppToast.show(context, message: errorMessage, type: ToastType.error);
      }
    }
  }

  void _copyKey(String key) {
    Clipboard.setData(ClipboardData(text: key));
    AppToast.show(context, message: 'API Key copied to clipboard', type: ToastType.success);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.cardColor,
      body: SafeArea(
        child: Column(
          children: [
            // Custom Header
            Container(
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              height: 56,
              decoration: BoxDecoration(
                color: context.glassBg,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: context.glassBorder, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: context.glassShadow, blurRadius: 15, offset: const Offset(0, 4)),
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
                        onPressed: () => Navigator.pop(context),
                      ),
                      const Spacer(),
                      Text(
                        'Developer API Keys',
                        style: TextStyle(color: context.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
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
                  : _buildBody(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    final userType = _user?['type'] ?? 1;
    final isVendor = userType == 3;
    final apiKey = _user?['apiKey'] ?? '';

    if (!isVendor) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.amber.shade50, shape: BoxShape.circle),
                child: Icon(Icons.lock_person, size: 64, color: Colors.amber.shade700),
              ),
              const SizedBox(height: 24),
              const Text('Vendor Exclusive', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              const Text(
                'Developer API access is strictly available to Vendor accounts. Upgrade your account to generate and manage API keys.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey, height: 1.5),
              ),
              const SizedBox(height: 32),
              GradientButton(
                text: 'Upgrade Now',
                onPressed: () {
                  Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const UpgradeScreen()));
                },
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.1)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppTheme.primaryColor.withValues(alpha: 0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.api_rounded, color: AppTheme.primaryColor, size: 32),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Developer Access', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      SizedBox(height: 4),
                      Text('Integrate our services into your own applications via API.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          const Text('Your Secret Key', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.subtleBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: context.borderColor),
            ),
            child: apiKey.isEmpty
                ? const Center(child: Text('No API Key generated yet', style: TextStyle(color: Colors.grey)))
                : Row(
                    children: [
                      Expanded(
                        child: Text(
                          _showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••••••',
                          style: TextStyle(
                            fontFamily: 'monospace',
                            color: context.textPrimary,
                            letterSpacing: _showKey ? 0 : 2,
                            fontSize: _showKey ? 13 : 16,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: Icon(_showKey ? Icons.visibility_off : Icons.visibility, color: Colors.grey),
                            onPressed: () => setState(() => _showKey = !_showKey),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy, color: AppTheme.primaryColor),
                            onPressed: () => _copyKey(apiKey),
                          ),
                        ],
                      ),
                    ],
                  ),
          ),
          
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.warning_amber_rounded, color: Colors.red.shade600, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Keep your API key secure. Do not share it publicly or commit it to version control systems.',
                    style: TextStyle(color: Colors.red.shade800, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _generating ? null : _generateKey,
              style: ElevatedButton.styleFrom(
                backgroundColor: context.cardColor,
                foregroundColor: AppTheme.primaryColor,
                side: const BorderSide(color: AppTheme.primaryColor),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: _generating
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(apiKey.isEmpty ? 'Generate Key' : 'Regenerate Key', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
          if (apiKey.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Text(
              'Regenerating will immediately invalidate your old key.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }
}
