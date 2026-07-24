import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

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
    {'name': 'MTN', 'image': 'assets/images/ISPlogo/mtnlogo.png'},
    {'name': 'AIRTEL', 'image': 'assets/images/ISPlogo/airtellogo.png'},
    {'name': 'GLO', 'image': 'assets/images/ISPlogo/glologo.jpg'},
    {'name': '9MOBILE', 'image': 'assets/images/ISPlogo/9mobile.png'},
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
      backgroundColor: context.cardColor,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.only(top: 68),
                child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.05),
                      Text(
                        'Recharge Card Printing',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Print recharge cards of all networks instantly.',
                        style: TextStyle(color: context.textSecondary, fontSize: 16),
                      ),
                      const SizedBox(height: 40),

                      // Network Selector
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
                            onTap: () {
                              setState(() {
                                _selectedNetwork = net['name'];
                              });
                            },
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
                                      net['image']!,
                                      width: 28,
                                      height: 28,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) {
                                        return Text(
                                          net['name']!,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: isSelected ? AppTheme.primaryColor : Colors.black54,
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    net['name']!,
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

                      // Denomination Dropdown
                      Text(
                        'Denomination',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          hintText: 'Select Denomination',
                        ),
                        initialValue: _selectedDenomination,
                        style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
                        items: _denominations.map((den) {
                          return DropdownMenuItem(
                            value: den,
                            child: Text('₦$den', style: const TextStyle(fontWeight: FontWeight.normal)),
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
                      Text(
                        'Quantity',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _quantityController,
                        keyboardType: TextInputType.number,
                        style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
                        decoration: const InputDecoration(
                          hintText: 'Enter quantity (1-10)',
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
                      Text(
                        'Name on Card',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _nameController,
                        style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
                        decoration: const InputDecoration(
                          hintText: 'Enter name to display on print',
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
                        Text(
                          'Generated Pins',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.textPrimary),
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
                                color: context.cardColor,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: context.borderColor),
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
                                  Text('Name: ${_nameController.text}', style: TextStyle(color: context.textSecondary, fontSize: 12)),
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
                                      Text('Serial:', style: TextStyle(fontWeight: FontWeight.w500)),
                                      Text(item['serial'] ?? '', style: TextStyle(fontFamily: 'Courier', color: context.textSecondary)),
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
          ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: FloatingScreenHeader(
                title: 'Recharge Cards',
                onBackPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
