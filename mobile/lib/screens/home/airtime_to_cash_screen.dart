import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'transaction_status_screen.dart';
import '../../main.dart';

import '../../core/connectivity_service.dart';

class AirtimeToCashScreen extends StatefulWidget {
  const AirtimeToCashScreen({super.key});

  @override
  State<AirtimeToCashScreen> createState() => _AirtimeToCashScreenState();
}

class _AirtimeToCashScreenState extends State<AirtimeToCashScreen> {
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  final _otpController = TextEditingController();
  final _transferPinController = TextEditingController();
  String? _selectedNetwork;
  bool _loading = false;
  String _sessionId = '';

  final List<Map<String, dynamic>> _networks = [
    {
      'name': 'MTN',
      'assetPath': 'assets/images/ISPlogo/mtnlogo.png',
      'color': Colors.yellow.shade700
    },
    {
      'name': 'Airtel',
      'assetPath': 'assets/images/ISPlogo/airtellogo.png',
      'color': Colors.red
    },
    {
      'name': 'Glo',
      'assetPath': 'assets/images/ISPlogo/glologo.jpg',
      'color': Colors.green
    },
    {
      'name': '9mobile',
      'assetPath': 'assets/images/ISPlogo/9mobile.png',
      'color': Colors.green.shade800
    },
  ];

  @override
  void initState() {
    super.initState();
    _phoneController.addListener(_autoSelectNetwork);
  }

  void _autoSelectNetwork() {
    String text = _phoneController.text;
    if (text.length >= 4) {
      String prefix = text.substring(0, 4);
      
      const mtn = ['0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'];
      const airtel = ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912'];
      const glo = ['0705', '0805', '0807', '0811', '0815', '0905', '0915'];
      const nineMobile = ['0809', '0817', '0818', '0908', '0909'];

      if (mtn.contains(prefix)) {
        setState(() => _selectedNetwork = 'MTN');
      } else if (airtel.contains(prefix)) {
        setState(() => _selectedNetwork = 'Airtel');
      } else if (glo.contains(prefix)) {
        setState(() => _selectedNetwork = 'Glo');
      } else if (nineMobile.contains(prefix)) {
        setState(() => _selectedNetwork = '9mobile');
      }
    }
  }

  void _generateOTP() async {
    if (!await ConnectivityService.ensureOnline(context)) return;
    if (!mounted) return;
    if (_loading) return;
    if (_selectedNetwork == null || _phoneController.text.isEmpty || _amountController.text.isEmpty) {
      AppToast.show(context, message: 'Please fill in all fields', type: ToastType.warning);
      return;
    }


    setState(() => _loading = true);
    final res = await ApiService.generateAirtimeToCashOTP(_selectedNetwork!.toUpperCase(), _phoneController.text);
    setState(() => _loading = false);

    if (!mounted) return;

    if (res['success']) {
      AppToast.show(context, message: 'OTP sent successfully!', type: ToastType.success);
      _showOTPBottomSheet();
    } else {
      final errorMsg = (res['error'] != null && res['error'].toString().isNotEmpty) ? res['error'].toString() : 'Failed to send OTP';
      AppToast.show(context, message: errorMsg, type: ToastType.error);
    }
  }

  void _showOTPBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              decoration: BoxDecoration(
                color: context.bottomSheetBg,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Verification Required',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Enter the OTP sent to ${_phoneController.text} and your SIM transfer PIN.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: context.textSecondary, fontSize: 14),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: 'Enter OTP',
                      labelText: 'OTP',
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _transferPinController,
                    keyboardType: TextInputType.number,
                    obscureText: true,
                    decoration: const InputDecoration(
                      hintText: '4-digit SIM transfer PIN',
                      labelText: 'Transfer PIN',
                    ),
                  ),
                  const SizedBox(height: 32),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GradientButton(
                          text: 'Verify',
                          onPressed: () async {
                            if (_otpController.text.isEmpty || _transferPinController.text.isEmpty) {
                              AppToast.show(context, message: 'Please fill in all fields', type: ToastType.warning);
                              return;
                            }

                            Navigator.pop(context); // Close bottom sheet
                            _verifyOTPAndProceed();
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _verifyOTPAndProceed() async {
    setState(() => _loading = true);
    final res = await ApiService.verifyAirtimeToCashOTP(_selectedNetwork!.toUpperCase(), _phoneController.text, _otpController.text);
    setState(() => _loading = false);

    if (!mounted) return;

    if (res['success']) {
      setState(() {
        _sessionId = res['data']['data']['sessionId'];
      });
      
      // Proceed to PinScreen for Site PIN
      final navigator = Navigator.of(context);
      final result = await navigator.push(
        MaterialPageRoute(
          builder: (_) => PinScreen(
            onVerify: (pin) async {
              return await _submitConversionRequest(pin);
            },
          ),
        ),
      );

      if (result != null) {
        if (!mounted) return;
        
        final bool isSuccess = result is Map ? result['success'] == true : (result == true);
        final String errorMessage = result is Map 
            ? (result['error'] != null && result['error'].toString().isNotEmpty ? result['error'].toString() : 'Transaction failed') 
            : 'Transaction failed';

        
        if (isSuccess) {
          showLocalNotification(
            id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
            title: 'Airtime Conversion Successful',
            body: 'Your airtime conversion request has been submitted.',
          );
        }

        navigator.push(
          MaterialPageRoute(
            builder: (_) => TransactionStatusScreen(
              isSuccess: isSuccess,
              title: isSuccess ? 'Transaction Successful' : 'Transaction Failed',
              message: isSuccess 
                  ? 'Your airtime conversion request was successful.' 
                  : errorMessage,
              details: isSuccess ? {
                'Service': 'Airtime2cash',
                'Network': _selectedNetwork!,
                'Amount': '₦${_amountController.text}',
                'Recipient': _phoneController.text,
              } : null,
            ),
          ),
        );

        if (isSuccess) {
          _phoneController.clear();
          _amountController.clear();
          _otpController.clear();
          _transferPinController.clear();
          setState(() {
            _selectedNetwork = null;
            _sessionId = '';
          });
        }
      }
    } else {
      final errorMsg = (res['error'] != null && res['error'].toString().isNotEmpty) ? res['error'].toString() : 'Verification failed';
      AppToast.show(context, message: errorMsg, type: ToastType.error);
    }

  }

  Future<Map<String, dynamic>> _submitConversionRequest(String sitePin) async {
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    
    final response = await ApiService.requestAirtimeToCash(
      network: _selectedNetwork!.toUpperCase(),
      amount: amount,
      phoneNumber: _phoneController.text,
      pin: sitePin,
      transferPin: _transferPinController.text,
      sessionId: _sessionId,
    );

    return response;
  }

  @override
  void dispose() {
    _phoneController.removeListener(_autoSelectNetwork);
    _phoneController.dispose();
    _amountController.dispose();
    _otpController.dispose();
    _transferPinController.dispose();
    super.dispose();
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
              child: RefreshIndicator(
                triggerMode: RefreshIndicatorTriggerMode.anywhere,
                edgeOffset: 76,
                onRefresh: () async {
                  await Future.delayed(const Duration(milliseconds: 600));
                  if (mounted) setState(() {});
                },
                color: AppTheme.primaryColor,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return SingleChildScrollView(
                      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                      padding: const EdgeInsets.fromLTRB(24.0, 76.0, 24.0, 24.0),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: constraints.maxHeight - 100),
                        child: IntrinsicHeight(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                            Text(
                              'Convert your airtime to wallet balance.',
                              style: TextStyle(color: context.textSecondary, fontSize: 14),
                            ),
                            const SizedBox(height: 20),
                    
                    Text(
                      'Select Network',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: _networks.map((net) {
                        bool isSelected = _selectedNetwork == net['name'];
                        return GestureDetector(
                          onTap: () => setState(() => _selectedNetwork = net['name']),
                          child: Container(
                            width: 65,
                            height: 65,
                            decoration: BoxDecoration(
                              color: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.05) : context.subtleBg,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected ? AppTheme.primaryColor : context.borderColor,
                                width: isSelected ? 1.5 : 1,
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.asset(
                                    net['assetPath'],
                                    width: 28,
                                    height: 28,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) => Icon(Icons.circle, color: net['color'], size: 28),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  net['name'],
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                    color: isSelected ? AppTheme.primaryColor : context.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 32),
                    
                    Text(
                      'Phone Number',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        hintText: 'Enter phone number sending from',
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    Text(
                      'Amount',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        hintText: 'Enter amount to convert',
                      ),
                    ),
                    const SizedBox(height: 40),
                    
                    GradientButton(
                      text: 'Proceed',
                      onPressed: _generateOTP,
                      loading: _loading,
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    ),
  ),
  Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: FloatingScreenHeader(
                title: 'Airtime2cash',
                onBackPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
