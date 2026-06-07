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
      backgroundColor: AppTheme.surfaceColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('KYC Verification', style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppTheme.primaryColor),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.verified_user_rounded, size: 80, color: AppTheme.primaryColor),
            const SizedBox(height: 24),
            const Text(
              'Complete Your KYC',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 8),
            const Text(
              'Verify your identity using your BVN or NIN to generate your virtual bank accounts and unlock higher transaction limits.',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedType,
                  isExpanded: true,
                  icon: const Icon(Icons.keyboard_arrow_down, color: AppTheme.primaryColor),
                  items: ['BVN', 'NIN'].map((String value) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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
            const SizedBox(height: 24),
            TextField(
              controller: _idController,
              keyboardType: TextInputType.number,
              maxLength: 11,
              decoration: InputDecoration(
                labelText: 'Enter your 11-digit $_selectedType',
                prefixIcon: const Icon(Icons.numbers_rounded, color: AppTheme.primaryColor),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2)),
              ),
            ),
            const SizedBox(height: 48),
            GradientButton(
              text: 'Verify Identity',
              onPressed: _submitKyc,
              loading: _isLoading,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded, color: Colors.blue),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Your data is encrypted and securely transmitted. We do not store your BVN or NIN in plain text.',
                      style: TextStyle(color: Colors.blue, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
