import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_native_contact_picker/flutter_native_contact_picker.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'transaction_status_screen.dart';
import '../../main.dart';

class AirtimeScreen extends StatefulWidget {
  const AirtimeScreen({super.key});

  @override
  State<AirtimeScreen> createState() => _AirtimeScreenState();
}

class _AirtimeScreenState extends State<AirtimeScreen> {
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  final _pinController = TextEditingController();
  String? _selectedNetwork;

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

  String _formatPhoneNumber(String phone) {
    String cleaned = phone.replaceAll(RegExp(r'[^0-9]'), ''); // Strip all non-digits
    if (cleaned.startsWith('234')) {
      cleaned = '0${cleaned.substring(3)}';
    }
    if (cleaned.length == 10 && !cleaned.startsWith('0')) {
      cleaned = '0$cleaned';
    }
    return cleaned;
  }

  Future<void> _selectContact() async {
    final contactPicker = FlutterNativeContactPicker();
    final contact = await contactPicker.selectContact();
    if (contact != null) {
      final phone = (contact.phoneNumbers != null && contact.phoneNumbers!.isNotEmpty) ? contact.phoneNumbers!.first : '';
      final formatted = _formatPhoneNumber(phone);
      setState(() {
        _phoneController.text = formatted;
        _autoSelectNetwork();
      });
    }
  }


  void _showConfirmationDrawer() {
    if (_selectedNetwork == null || _phoneController.text.isEmpty || _amountController.text.isEmpty) {
      AppToast.show(context, message: 'Please fill in all fields', type: ToastType.warning);
      return;
    }

    double amount = double.tryParse(_amountController.text) ?? 0;
    if (amount < 100) {
      AppToast.show(context, message: 'Minimum amount for airtime is ₦100', type: ToastType.warning);
      return;
    }

    // Clear PIN inputs
    _pinController.clear();

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
                bottom: MediaQuery.of(context).viewInsets.bottom + 24, // Handle keyboard
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
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
                    'Confirm Purchase',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  _detailRow('Network', _selectedNetwork!),
                  _detailRow('Phone Number', _phoneController.text),
                  _detailRow('Amount', '₦${formatCurrency(amount)}'),
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
                          text: 'Confirm',
                          onPressed: () async {
                            final navigator = Navigator.of(context);
                            navigator.pop(); // Close drawer
                            
                            final result = await navigator.push(
                              MaterialPageRoute(
                                builder: (_) => PinScreen(
                                  onVerify: (pin) async {
                                    return await _processPurchaseWithPin(pin);
                                  },
                                ),
                              ),
                            );
                            
                            if (result != null) {
                              if (!mounted) return;
                              
                              final bool isSuccess = result is Map ? result['success'] == true : (result == true);
                              final String errorMessage = result is Map ? (result['error'] ?? 'Transaction failed') : 'Transaction failed';
                              
                              final network = _selectedNetwork ?? '';
                              final recipient = _phoneController.text;
                              final amount = '₦${_amountController.text}';
                              
                              if (isSuccess) {
                                showLocalNotification(
                                  id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
                                  title: 'Airtime Purchase Successful',
                                  body: 'You have successfully recharged $recipient with $amount',
                                );
                              } else {
                                showLocalNotification(
                                  id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
                                  title: 'Airtime Purchase Failed',
                                  body: 'Failed to recharge airtime: $errorMessage',
                                );
                              }
                              
                              navigator.push(
                                MaterialPageRoute(
                                  builder: (_) => TransactionStatusScreen(
                                    isSuccess: isSuccess,
                                    title: isSuccess ? 'Transaction Successful' : 'Transaction Failed',
                                    message: isSuccess 
                                        ? 'Your airtime purchase was successful.' 
                                        : errorMessage,
                                    details: isSuccess ? {
                                      'Service': 'Airtime Purchase',
                                      'Network': network,
                                      'Recipient': recipient,
                                      'Amount': amount,
                                    } : null,
                                  ),
                                ),
                              );
                              
                              if (isSuccess) {
                                _phoneController.clear();
                                _amountController.clear();
                                setState(() {
                                  _selectedNetwork = null;
                                });
                              }
                            }
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

  Future<Map<String, dynamic>> _processPurchaseWithPin(String pin) async {
    final amount = double.tryParse(_amountController.text) ?? 0.0;

    // Fetch services to find the correct serviceId
    final servicesResult = await ApiService.getServices('airtime');
    
    if (servicesResult['success'] != true) {
      return {'success': false, 'error': 'Failed to fetch services'};
    }

    final services = servicesResult['services'] as List;
    final service = services.firstWhere(
      (s) => s['provider'].toString().toUpperCase() == _selectedNetwork!.toUpperCase(),
      orElse: () => null,
    );

    if (service == null) {
      return {'success': false, 'error': 'Service not available for this network'};
    }

    final response = await ApiService.purchaseService(
      serviceId: service['id'].toString(),
      recipient: _phoneController.text,
      amount: amount,
      pin: pin,
      networkType: 'VTU',
    );

    return response;
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.black87),
          ),
          const Divider(height: 16, color: Color(0xFFF5F5F5)),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _phoneController.removeListener(_autoSelectNetwork);
    _phoneController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Custom Floating TopBar
            Container(
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 15,
                    offset: const Offset(0, 4),
                  ),
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
                      const Text(
                        'Buy Airtime',
                        style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const Spacer(),
                      const SizedBox(width: 48), // To balance the back button
                    ],
                  ),
                ),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(height: MediaQuery.of(context).size.height * 0.07),
              Text(
                'Buy Airtime',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Recharge your phone or send airtime to others.',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
              ),
              const SizedBox(height: 40),
              
              const Text(
                'Select Network',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87),
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
                        color: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.05) : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? AppTheme.primaryColor : Colors.grey.shade200,
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
                              color: isSelected ? AppTheme.primaryColor : Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 32),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Phone Number',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  GestureDetector(
                    onTap: _selectContact,
                    child: Text(
                      'Select from contacts',
                      style: TextStyle(color: AppTheme.primaryColor, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                onChanged: (val) {
                  final formatted = _formatPhoneNumber(val);
                  if (formatted != val) {
                    _phoneController.value = TextEditingValue(
                      text: formatted,
                      selection: TextSelection.collapsed(offset: formatted.length),
                    );
                  }
                  _autoSelectNetwork();
                },
                decoration: const InputDecoration(
                  hintText: 'Enter phone number',
                ),
              ),
              const SizedBox(height: 24),
              
              const Text(
                'Amount',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: 'Enter amount',
                ),
              ),
              const SizedBox(height: 40),
              
              GradientButton(
                text: 'Proceed',
                onPressed: _showConfirmationDrawer,
              ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

}
