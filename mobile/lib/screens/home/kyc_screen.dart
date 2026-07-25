import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';

class KycScreen extends StatefulWidget {
  const KycScreen({super.key});

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> {
  final _idController = TextEditingController();
  String _selectedType = 'BVN';
  bool _isLoading = false;

  void _submitKyc() async {
    final idNumber = _idController.text.trim();
    if (idNumber.length != 11) {
      AppToast.show(context, message: 'ID number must be exactly 11 digits', type: ToastType.warning);
      return;
    }

    setState(() => _isLoading = true);

    Map<String, dynamic> result;
    if (_selectedType == 'BVN') {
      result = await ApiService.verifyBvn(idNumber);
    } else {
      result = await ApiService.verifyNin(idNumber);
    }

    if (mounted) {
      setState(() => _isLoading = false);
      if (result['success']) {
        final account = result['data']?['account'];
        if (account != null && account['accountNumber'] != null) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (_) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(
                children: [
                  Icon(Icons.verified_rounded, color: Colors.green),
                  SizedBox(width: 8),
                  Text('KYC Verified!'),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Your identity has been verified and your virtual account is ready:'),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.green.shade200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Bank: ${account['bankName'] ?? 'Palmpay'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text('Account No: ${account['accountNumber']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        if (account['accountName'] != null)
                          Text('Name: ${account['accountName']}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
              actions: [
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    Navigator.of(context).pop(true);
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                  child: const Text('Continue', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        } else {
          AppToast.show(context, message: result['data']?['message'] ?? 'KYC Verified successfully!', type: ToastType.success);
          Navigator.pop(context, true);
        }
      } else {
        AppToast.show(context, message: result['error'] ?? 'Verification failed', type: ToastType.error);
      }
    }
  }

  @override
  void dispose() {
    _idController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.surfaceColor,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: RefreshIndicator(
                triggerMode: RefreshIndicatorTriggerMode.anywhere,
                edgeOffset: 76,
                onRefresh: () async {
                  await Future.delayed(const Duration(milliseconds: 600));
                  if (mounted) setState(() {});
                },
                color: AppTheme.primaryColor,
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(24.0, 76.0, 24.0, 24.0),
                  child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
            // Centered shield icon with dodger blue background circle
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: AppTheme.secondaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.verified_user_rounded,
                size: 48,
                color: AppTheme.secondaryColor,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Complete Your KYC',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: context.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Verify your identity using your BVN or NIN to generate your virtual bank accounts and unlock higher transaction limits.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: context.textSecondary, height: 1.5),
            ),
            const SizedBox(height: 32),
            // ID Type selector
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: context.subtleBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: context.borderColor),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedType,
                  isExpanded: true,
                  icon: const Icon(Icons.keyboard_arrow_down, color: AppTheme.secondaryColor),
                  items: ['BVN', 'NIN'].map((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(
                        value,
                        style: TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 15,
                          color: context.textPrimary,
                        ),
                      ),
                    );
                  }).toList(),
                  onChanged: (newValue) {
                    if (newValue != null) {
                      setState(() {
                        _selectedType = newValue;
                        _idController.clear();
                      });
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 20),
            // ID number input
            TextField(
              controller: _idController,
              keyboardType: TextInputType.number,
              maxLength: 11,
              style: TextStyle(
                fontWeight: FontWeight.normal,
                fontSize: 15,
                color: context.textPrimary,
              ),
              decoration: InputDecoration(
                labelText: 'Enter your 11-digit $_selectedType',
                labelStyle: TextStyle(
                  color: context.textMuted,
                  fontWeight: FontWeight.normal,
                  fontSize: 14,
                ),
                prefixIcon: const Icon(Icons.numbers_rounded, color: AppTheme.secondaryColor),
                filled: true,
                fillColor: context.subtleBg,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: context.borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.secondaryColor, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 36),
            GradientButton(
              text: 'Verify Identity',
              onPressed: _submitKyc,
              loading: _isLoading,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.secondaryColor.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.secondaryColor.withValues(alpha: 0.15)),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: AppTheme.secondaryColor.withValues(alpha: 0.7)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Your data is encrypted and securely transmitted. We do not store your BVN or NIN in plain text.',
                      style: TextStyle(color: context.textSecondary, fontSize: 12, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
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
      title: 'KYC Verification',
      onBackPressed: () => Navigator.pop(context),
    ),
  ),
],
),
),
);
}
}
