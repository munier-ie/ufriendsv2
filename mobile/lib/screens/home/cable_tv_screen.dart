import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'transaction_status_screen.dart';
import '../../main.dart';

class CableTvScreen extends StatefulWidget {
  const CableTvScreen({super.key});

  @override
  State<CableTvScreen> createState() => _CableTvScreenState();
}

class _CableTvScreenState extends State<CableTvScreen> {
  final _iucController = TextEditingController();
  String? _selectedProvider;
  String? _verifiedName;
  bool _isVerifying = false;
  
  List<dynamic> _allPlans = [];
  List<dynamic> _providerPlans = [];
  Map<String, dynamic>? _selectedPlan;
  bool _isLoadingPlans = true;

  final List<Map<String, dynamic>> _providers = [
    {
      'id': 'dstv',
      'name': 'DSTV',
      'assetPath': 'assets/images/cable_tv/DSTV.jpg',
      'color': const Color(0xFF005A9C)
    },
    {
      'id': 'gotv',
      'name': 'GOTV',
      'assetPath': 'assets/images/cable_tv/GOTV.png',
      'color': const Color(0xFFE31837)
    },
    {
      'id': 'startimes',
      'name': 'Startimes',
      'assetPath': 'assets/images/cable_tv/STARTIMES.jpg',
      'color': const Color(0xFFFF6600)
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchPlans();
  }

  Future<void> _fetchPlans() async {
    final result = await ApiService.getServices('cable');
    if (result['success'] == true && mounted) {
      setState(() {
        _allPlans = result['services'] ?? [];
        _isLoadingPlans = false;
      });
    } else {
      if (mounted) {
        setState(() => _isLoadingPlans = false);
        AppToast.show(context, message: 'Failed to load plans', type: ToastType.error);
      }
    }
  }

  void _onProviderSelected(String providerId) {
    setState(() {
      _selectedProvider = providerId;
      _verifiedName = null;
      _selectedPlan = null;
      _providerPlans = _allPlans.where((p) => p['provider'].toString().toLowerCase() == providerId.toLowerCase()).toList();
    });
  }

  Future<void> _verifyIuc() async {
    if (_iucController.text.isEmpty) {
      AppToast.show(context, message: 'Please enter Smart Card/IUC number', type: ToastType.warning);
      return;
    }
    
    setState(() => _isVerifying = true);
    
    final result = await ApiService.verifyUtility(
      type: 'cable',
      provider: _selectedProvider!,
      number: _iucController.text,
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
    if (_selectedProvider == null || _selectedPlan == null || _verifiedName == null) {
      AppToast.show(context, message: 'Please complete all steps', type: ToastType.warning);
      return;
    }

    final amount = double.tryParse(_selectedPlan!['price'].toString()) ?? 0;

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
              _detailRow('Provider', _selectedProvider!.toUpperCase()),
              _detailRow('Customer Name', _verifiedName!),
              _detailRow('Smart Card/IUC', _iucController.text),
              _detailRow('Plan', _selectedPlan!['name']),
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
                        navigator.pop();
                        
                        final result = await navigator.push(
                          MaterialPageRoute(
                            builder: (_) => PinScreen(
                              onVerify: (pin) async {
                                return await ApiService.purchaseService(
                                  serviceId: _selectedPlan!['id'].toString(),
                                  recipient: _iucController.text, // Usually phone, but using IUC
                                  amount: amount,
                                  pin: pin,
                                  iucNumber: _iucController.text,
                                  subscriptionType: 'change', // Assuming default
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
                              title: 'Cable TV Subscription Successful',
                              body: 'Your ${_selectedProvider!.toUpperCase()} subscription for ${_selectedPlan!['name']} was successful',
                            );
                          } else {
                            showLocalNotification(
                              id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
                              title: 'Cable TV Subscription Failed',
                              body: 'Failed to subscribe: $errorMessage',
                            );
                          }
                          
                          navigator.push(
                            MaterialPageRoute(
                              builder: (_) => TransactionStatusScreen(
                                isSuccess: isSuccess,
                                title: isSuccess ? 'Subscription Successful' : 'Transaction Failed',
                                message: isSuccess 
                                    ? 'Your cable TV subscription was successful.' 
                                    : errorMessage,
                                details: isSuccess ? {
                                  'Provider': _selectedProvider!.toUpperCase(),
                                  'IUC Number': _iucController.text,
                                  'Plan': _selectedPlan!['name'],
                                  'Amount': '₦${formatCurrency(amount)}',
                                } : null,
                              ),
                            ),
                          );
                          
                          if (isSuccess) {
                            setState(() {
                              _iucController.clear();
                              _verifiedName = null;
                              _selectedPlan = null;
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
    _iucController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
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
                        'Cable TV',
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
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: MediaQuery.of(context).size.height * 0.05),
                    Text(
                      'Cable TV',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Renew your DSTV, GOTV & Startimes subscriptions.',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                    ),
                    const SizedBox(height: 40),
                    
                    const Text(
                      'Select Provider',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: _providers.map((prov) {
                        bool isSelected = _selectedProvider == prov['id'];
                        return GestureDetector(
                          onTap: () => _onProviderSelected(prov['id']),
                          child: Container(
                            width: 80,
                            height: 80,
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
                                  borderRadius: BorderRadius.circular(12),
                                  child: Image.asset(
                                    prov['assetPath'],
                                    width: 40,
                                    height: 40,
                                    fit: BoxFit.contain,
                                    errorBuilder: (context, error, stackTrace) => Icon(Icons.tv, color: prov['color'], size: 32),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    
                    if (_selectedProvider != null) ...[
                      const SizedBox(height: 32),
                      const Text(
                        'Smart Card / IUC Number',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _iucController,
                              keyboardType: TextInputType.number,
                              onChanged: (v) {
                                if (_verifiedName != null) {
                                  setState(() => _verifiedName = null);
                                }
                              },
                              decoration: const InputDecoration(
                                hintText: 'Enter Smart Card or IUC',
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
                              onPressed: _verifyIuc,
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
                      const Text(
                        'Select Plan',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(16),
                          color: Colors.grey.shade50,
                        ),
                        child: _isLoadingPlans 
                          ? const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
                          : DropdownButtonHideUnderline(
                          child: DropdownButton<Map<String, dynamic>>(
                            isExpanded: true,
                            hint: const Text('Choose a subscription plan', style: TextStyle(fontSize: 13)),
                            value: _selectedPlan,
                            icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
                            items: _providerPlans.map((plan) {
                              return DropdownMenuItem<Map<String, dynamic>>(
                                value: plan,
                                child: Text(
                                  '${plan['name']} - ₦${formatCurrency(double.tryParse(plan['price'].toString()) ?? 0)}',
                                  style: const TextStyle(fontSize: 13),
                                ),
                              );
                            }).toList(),
                            onChanged: (val) {
                              setState(() {
                                _selectedPlan = val;
                              });
                            },
                          ),
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
                            'Supported Providers',
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: _providers.map((prov) {
                              return Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 8.0),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.asset(
                                    prov['assetPath'],
                                    width: 30,
                                    height: 30,
                                    fit: BoxFit.cover,
                                    errorBuilder: (context, error, stackTrace) => const SizedBox(),
                                  ),
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
