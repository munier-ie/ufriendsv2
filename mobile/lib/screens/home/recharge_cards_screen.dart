import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'dart:ui';

class RechargeCardsScreen extends StatefulWidget {
  const RechargeCardsScreen({super.key});

  @override
  State<RechargeCardsScreen> createState() => _RechargeCardsScreenState();
}

class _RechargeCardsScreenState extends State<RechargeCardsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController(text: '1');
  final _nameController = TextEditingController();
  
  String? _selectedNetwork;
  String? _selectedDenomination;
  bool _loading = false;
  List<dynamic> _generatedPins = [];

  final List<Map<String, String>> _networks = [
    {'name': 'MTN', 'image': 'assets/images/mtn.png'},
    {'name': 'AIRTEL', 'image': 'assets/images/airtel.png'},
    {'name': 'GLO', 'image': 'assets/images/glo.png'},
    {'name': '9MOBILE', 'image': 'assets/images/9mobile.png'},
  ];

  final List<String> _denominations = ['100', '200', '500', '1000'];

  @override
  void dispose() {
    _quantityController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<Map<String, dynamic>> _submitRequest(String sitePin) async {
    setState(() {
      _loading = true;
      _generatedPins = [];
    });

    try {
      final res = await _mockPurchase(sitePin);

      if (res['success']) {
        setState(() {
          _generatedPins = res['pins'] ?? [];
        });
      }
      return res;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  // Mock function since ApiService doesn't have it yet
  Future<Map<String, dynamic>> _mockPurchase(String sitePin) async {
    await Future.delayed(const Duration(seconds: 2));
    
    // In a real app, this should be a call to ApiService
    // Let's assume the backend endpoint is implemented
    try {
      final response = await ApiService.purchaseRechargeCards(
        network: _selectedNetwork!,
        denomination: int.parse(_selectedDenomination!),
        quantity: int.parse(_quantityController.text),
        name: _nameController.text,
        pin: sitePin,
      );
      return response;
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  void _onProceed() async {
    if (_selectedNetwork == null) {
      AppToast.show(context, message: 'Please select a network', type: ToastType.warning);
      return;
    }
    if (_selectedDenomination == null) {
      AppToast.show(context, message: 'Please select a denomination', type: ToastType.warning);
      return;
    }
    if (!_formKey.currentState!.validate()) return;

    // Show Pin Screen
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          title: 'Enter Transaction PIN',
          onVerify: (pin) async {
            return await _submitRequest(pin);
          },
        ),
      ),
    );

    if (result != null) {
      if (!mounted) return;
      final bool isSuccess = result is Map ? result['success'] == true : (result == true);
      if (isSuccess) {
        AppToast.show(context, message: 'Purchase Successful!', type: ToastType.success);
      } else {
        final errorMsg = result is Map ? (result['error'] ?? 'Purchase failed') : 'Purchase failed';
        AppToast.show(context, message: errorMsg, type: ToastType.error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Background Gradient
          Container(
            height: 300,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryColor.withValues(alpha: 0.1),
                  Colors.white,
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Floating Top Bar (Custom)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.5)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 5),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
                                onPressed: () => Navigator.pop(context),
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'Recharge Card Printing',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 32),

                    // Network Selector
                    const Text(
                      'Select Network',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 80,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _networks.length,
                        itemBuilder: (context, index) {
                          final net = _networks[index];
                          final isSelected = _selectedNetwork == net['name'];
                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedNetwork = net['name'];
                              });
                            },
                            child: Container(
                              margin: const EdgeInsets.only(right: 16),
                              width: 80,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isSelected ? AppTheme.primaryColor : Colors.grey.shade200,
                                  width: isSelected ? 2 : 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: isSelected
                                        ? AppTheme.primaryColor.withValues(alpha: 0.1)
                                        : Colors.black.withValues(alpha: 0.02),
                                    blurRadius: 10,
                                    offset: const Offset(0, 5),
                                  ),
                                ],
                              ),
                              child: Center(
                                child: Image.asset(
                                  net['image']!,
                                  width: 40,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Text(
                                      net['name']!,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: isSelected ? AppTheme.primaryColor : Colors.black54,
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Denomination Dropdown
                    const Text(
                      'Denomination',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2),
                        ),
                      ),
                      initialValue: _selectedDenomination,
                      hint: const Text('Select Denomination'),
                      items: _denominations.map((den) {
                        return DropdownMenuItem(
                          value: den,
                          child: Text('₦$den'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedDenomination = val;
                        });
                      },
                    ),

                    const SizedBox(height: 24),

                    // Quantity
                    const Text(
                      'Quantity',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _quantityController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        hintText: 'Enter quantity (1-10)',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2),
                        ),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Enter quantity';
                        final q = int.tryParse(val);
                        if (q == null || q < 1 || q > 10) return 'Quantity must be 1-10';
                        return null;
                      },
                    ),

                    const SizedBox(height: 24),

                    // Name on Card
                    const Text(
                      'Name on Card',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        hintText: 'Enter name to display on print',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2),
                        ),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Enter name';
                        return null;
                      },
                    ),

                    const SizedBox(height: 32),

                    // Proceed Button
                    GradientButton(
                      text: 'Generate Pins',
                      onPressed: _onProceed,
                      loading: _loading,
                    ),

                    const SizedBox(height: 32),

                    // Generated Pins Display
                    if (_generatedPins.isNotEmpty) ...[
                      const Text(
                        'Generated Pins',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      const SizedBox(height: 12),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _generatedPins.length,
                        itemBuilder: (context, index) {
                          final item = _generatedPins[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade200),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.02),
                                  blurRadius: 5,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '$_selectedNetwork ₦$_selectedDenomination',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.green.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Text(
                                        'SUCCESS',
                                        style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text('Name: ${_nameController.text}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('PIN:', style: TextStyle(fontWeight: FontWeight.w500)),
                                    Text(item['token'] ?? '', style: const TextStyle(fontFamily: 'Courier', fontWeight: FontWeight.bold, fontSize: 16)),
                                  ],
                                ),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('Serial:', style: TextStyle(fontWeight: FontWeight.w500)),
                                    Text(item['serial'] ?? '', style: TextStyle(fontFamily: 'Courier', color: Colors.grey.shade600)),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
