import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'transaction_status_screen.dart';
import '../../main.dart';

class ElectricityScreen extends StatefulWidget {
  const ElectricityScreen({super.key});

  @override
  State<ElectricityScreen> createState() => _ElectricityScreenState();
}

class _ElectricityScreenState extends State<ElectricityScreen> {
  final _meterController = TextEditingController();
  final _amountController = TextEditingController();
  String? _selectedProvider;
  String _selectedMeterType = 'prepaid';
  String? _verifiedName;
  bool _isVerifying = false;
  
  List<dynamic> _allServices = [];
  Map<String, dynamic>? _electricityService;
  bool _isLoadingServices = true;

  final List<Map<String, dynamic>> _providers = [
    {
      'id': 'ikeja',
      'name': 'Ikeja',
      'assetPath': 'assets/images/electricity/ikeja.png',
      'color': const Color(0xFF005A9C)
    },
    {
      'id': 'eko',
      'name': 'Eko',
      'assetPath': 'assets/images/electricity/ekedc.png',
      'color': const Color(0xFF00B050)
    },
    {
      'id': 'abuja',
      'name': 'Abuja',
      'assetPath': 'assets/images/electricity/abuja.png',
      'color': const Color(0xFFE31837)
    },
    {
      'id': 'kano',
      'name': 'Kano',
      'assetPath': 'assets/images/electricity/kedco.png',
      'color': const Color(0xFF1E90FF)
    },
    {
      'id': 'port harcourt',
      'name': 'PHED',
      'assetPath': 'assets/images/electricity/portharcourt.png',
      'color': const Color(0xFF004687)
    },
    {
      'id': 'jos',
      'name': 'Jos',
      'assetPath': 'assets/images/electricity/jos.jpg',
      'color': const Color(0xFF4682B4)
    },
    {
      'id': 'ibadan',
      'name': 'Ibadan',
      'assetPath': 'assets/images/electricity/ibadan.png',
      'color': const Color(0xFFFF6600)
    },
    {
      'id': 'kaduna',
      'name': 'Kaduna',
      'assetPath': 'assets/images/electricity/kaduna.jpg',
      'color': const Color(0xFF228B22)
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchServices();
  }

  Future<void> _fetchServices() async {
    final result = await ApiService.getServices('electricity');
    if (result['success'] == true && mounted) {
      setState(() {
        _allServices = result['services'] ?? [];
        _isLoadingServices = false;
      });
    } else {
      if (mounted) {
        setState(() => _isLoadingServices = false);
        AppToast.show(context, message: 'Failed to load services', type: ToastType.error);
      }
    }
  }

  void _onProviderSelected(String providerId) {
    setState(() {
      _selectedProvider = providerId;
      _verifiedName = null;
      _amountController.clear();
      // Find the specific electricity service for this provider
      try {
        _electricityService = _allServices.firstWhere((p) => p['provider'].toString().toLowerCase() == providerId.toLowerCase());
      } catch (e) {
        _electricityService = null;
      }
    });
  }

  Future<void> _verifyMeter() async {
    if (_meterController.text.isEmpty) {
      AppToast.show(context, message: 'Please enter Meter number', type: ToastType.warning);
      return;
    }
    
    setState(() => _isVerifying = true);
    
    final result = await ApiService.verifyUtility(
      type: 'electricity',
      provider: _selectedProvider!,
      number: _meterController.text,
      meterType: _selectedMeterType,
    );
    
    if (!mounted) return;
    
    setState(() => _isVerifying = false);
    
    if (result['success'] == true) {
      setState(() {
        final data = result['data'] ?? {};
        _verifiedName = data['name'] ?? data['customerName'] ?? data['customer_name'] ?? 'Verified Customer';
      });
      AppToast.show(context, message: 'Verified successfully', type: ToastType.success);
    } else {
      setState(() => _verifiedName = null);
      AppToast.show(context, message: result['error'] ?? 'Verification failed', type: ToastType.error);
    }
  }

  void _showConfirmationDrawer() {
    if (_selectedProvider == null || _verifiedName == null || _amountController.text.isEmpty) {
      AppToast.show(context, message: 'Please complete all steps', type: ToastType.warning);
      return;
    }

    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount < 100) {
      AppToast.show(context, message: 'Minimum amount is ₦100', type: ToastType.warning);
      return;
    }

    // Usually there is a service fee. Fetch it from the service object if available, otherwise 100.
    final serviceCharge = double.tryParse(_electricityService?['price']?.toString() ?? '100') ?? 100.0;
    final totalAmount = amount + serviceCharge;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
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
                'Confirm Purchase',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              _detailRow('Provider', _selectedProvider!.toUpperCase()),
              _detailRow('Customer Name', _verifiedName!),
              _detailRow('Meter Number', _meterController.text),
              _detailRow('Meter Type', _selectedMeterType.toUpperCase()),
              _detailRow('Token Amount', '₦${formatCurrency(amount)}'),
              _detailRow('Service Charge', '₦${formatCurrency(serviceCharge)}'),
              _detailRow('Total Payment', '₦${formatCurrency(totalAmount)}'),
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
                        navigator.pop();
                        
                        final result = await navigator.push(
                          MaterialPageRoute(
                            builder: (_) => PinScreen(
                              onVerify: (pin) async {
                                return await ApiService.purchaseService(
                                  serviceId: _electricityService?['id']?.toString() ?? '0',
                                  recipient: _meterController.text, // Usually phone, but using Meter Number here
                                  amount: amount,
                                  pin: pin,
                                  meterNumber: _meterController.text,
                                  meterType: _selectedMeterType,
                                );
                              },
                            ),
                          ),
                        );
                        
                        if (result != null) {
                          if (!mounted) return;
                          
                          final bool isSuccess = result is Map ? result['success'] == true : (result == true);
                          final String errorMessage = result is Map ? (result['error'] ?? 'Transaction failed') : 'Transaction failed';
                          
                          if (isSuccess) {
                            showLocalNotification(
                              id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
                              title: 'Electricity Purchase Successful',
                              body: 'Your ${_selectedProvider!.toUpperCase()} electricity token of ₦${formatCurrency(amount)} was successful',
                            );
                          } else {
                            showLocalNotification(
                              id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
                              title: 'Electricity Purchase Failed',
                              body: 'Failed to purchase electricity: $errorMessage',
                            );
                          }
                          
                          navigator.push(
                            MaterialPageRoute(
                              builder: (_) => TransactionStatusScreen(
                                isSuccess: isSuccess,
                                title: isSuccess ? 'Purchase Successful' : 'Transaction Failed',
                                message: isSuccess 
                                    ? 'Your electricity token purchase was successful.' 
                                    : errorMessage,
                                details: isSuccess ? {
                                  'Provider': _selectedProvider!.toUpperCase(),
                                  'Meter Number': _meterController.text,
                                  'Amount': '₦${formatCurrency(totalAmount)}',
                                } : null,
                              ),
                            ),
                          );
                          
                          if (isSuccess) {
                            setState(() {
                              _meterController.clear();
                              _amountController.clear();
                              _verifiedName = null;
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
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: context.textMuted, fontSize: 12)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: context.textPrimary),
          ),
          const Divider(height: 16, color: Color(0xFFF5F5F5)),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _meterController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.cardColor,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              height: 56,
              decoration: BoxDecoration(
                color: context.glassBg,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: context.glassBorder, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: context.glassShadow,
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
                      Text(
                        'Electricity',
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
              child: _isLoadingServices 
              ? const Center(child: CircularProgressIndicator()) 
              : SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: MediaQuery.of(context).size.height * 0.05),
                    Text(
                      'Electricity Bills',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Pay your electricity bills without hassle.',
                      style: TextStyle(color: context.textSecondary, fontSize: 14),
                    ),
                    const SizedBox(height: 40),
                    
                    Text(
                      'Select Distribution Company',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: context.textPrimary),
                    ),
                    const SizedBox(height: 12),
                    
                    SizedBox(
                      height: 100,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _providers.length,
                        itemBuilder: (context, index) {
                          final prov = _providers[index];
                          bool isSelected = _selectedProvider == prov['id'];
                          return GestureDetector(
                            onTap: () => _onProviderSelected(prov['id']),
                            child: Container(
                              width: 80,
                              margin: const EdgeInsets.only(right: 12),
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
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.asset(
                                      prov['assetPath'],
                                      width: 40,
                                      height: 40,
                                      fit: BoxFit.contain,
                                      errorBuilder: (context, error, stackTrace) => Icon(Icons.bolt, color: prov['color'], size: 32),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    prov['name'],
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                      color: isSelected ? AppTheme.primaryColor : context.textPrimary,
                                    ),
                                    textAlign: TextAlign.center,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    
                    if (_selectedProvider != null) ...[
                      const SizedBox(height: 32),
                      
                      Text(
                        'Meter Type',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() {
                                _selectedMeterType = 'prepaid';
                                _verifiedName = null;
                              }),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  gradient: _selectedMeterType == 'prepaid' ? const LinearGradient(colors: [Color(0xFF1E90FF), Color(0xFF00008B)]) : null,
                                  color: _selectedMeterType == 'prepaid' ? null : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: Text(
                                    'Prepaid',
                                    style: TextStyle(
                                      color: _selectedMeterType == 'prepaid' ? Colors.white : context.textPrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() {
                                _selectedMeterType = 'postpaid';
                                _verifiedName = null;
                              }),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  gradient: _selectedMeterType == 'postpaid' ? const LinearGradient(colors: [Color(0xFF1E90FF), Color(0xFF00008B)]) : null,
                                  color: _selectedMeterType == 'postpaid' ? null : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: Text(
                                    'Postpaid',
                                    style: TextStyle(
                                      color: _selectedMeterType == 'postpaid' ? Colors.white : context.textPrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 24),
                      Text(
                        'Meter Number',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _meterController,
                              keyboardType: TextInputType.number,
                              onChanged: (v) {
                                if (_verifiedName != null) {
                                  setState(() => _verifiedName = null);
                                }
                              },
                              decoration: const InputDecoration(
                                hintText: 'Enter Meter Number',
                                hintStyle: TextStyle(fontSize: 13),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          SizedBox(
                            width: 140,
                            child: GradientButton(
                              text: 'Verify',
                              loading: _isVerifying,
                              onPressed: _verifyMeter,
                            ),
                          ),
                        ],
                      ),
                    ],

                    if (_verifiedName != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.check_circle, color: Colors.green.shade600, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _verifiedName!,
                                style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      Text(
                        'Amount',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _amountController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: 'Enter amount to pay',
                          hintStyle: TextStyle(fontSize: 13),
                        ),
                      ),
                      
                      const SizedBox(height: 40),
                      GradientButton(
                        text: 'Proceed to Pay',
                        onPressed: _showConfirmationDrawer,
                      ),
                    ],
                    
                    const SizedBox(height: 60),
                    // Support Section
                    Center(
                      child: Column(
                        children: [
                          Text(
                            'Supported Distribution Companies',
                            style: TextStyle(color: context.textMuted, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            alignment: WrapAlignment.center,
                            spacing: 8,
                            runSpacing: 8,
                            children: _providers.map((prov) {
                              return ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.asset(
                                  prov['assetPath'],
                                  width: 30,
                                  height: 30,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => const SizedBox(),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
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
