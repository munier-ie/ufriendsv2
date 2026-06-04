import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'transaction_status_screen.dart';
import '../../main.dart';

class ExamPinsScreen extends StatefulWidget {
  const ExamPinsScreen({super.key});

  @override
  State<ExamPinsScreen> createState() => _ExamPinsScreenState();
}

class _ExamPinsScreenState extends State<ExamPinsScreen> {
  final _formKey = GlobalKey<FormState>();
  
  Map<String, dynamic>? _selectedExamPlan;
  bool _loading = false;
  bool _isLoadingPlans = false;
  
  List<dynamic> _allPlans = [];

  final List<Map<String, dynamic>> _examTypes = [
    {
      'provider_key': 'waec',
      'name': 'WAEC',
      'assetPath': 'assets/images/exam/waec.png',
      'color': Colors.blue.shade800
    },
    {
      'provider_key': 'neco',
      'name': 'NECO',
      'assetPath': 'assets/images/exam/neco.jpeg',
      'color': Colors.green.shade700
    },
  ];

  final List<String> _quantities = ['1', '2', '3', '4', '5'];
  String _selectedQuantity = '1';
  String? _selectedProviderKey;

  @override
  void initState() {
    super.initState();
    _fetchPlans();
  }

  Future<void> _fetchPlans() async {
    setState(() => _isLoadingPlans = true);
    final result = await ApiService.getServices('exam');
    if (mounted) {
      setState(() {
        _isLoadingPlans = false;
        if (result['success']) {
          _allPlans = result['services'];
        } else {
          AppToast.show(context, message: result['error'] ?? 'Failed to load exam pins', type: ToastType.error);
        }
      });
    }
  }

  void _setProvider(String providerKey) {
    setState(() {
      _selectedProviderKey = providerKey;
      
      // Try to auto-select the plan for this provider
      try {
        _selectedExamPlan = _allPlans.firstWhere(
          (plan) => plan['provider']?.toString().toLowerCase() == providerKey.toLowerCase()
        );
      } catch (e) {
        _selectedExamPlan = null;
      }
    });
  }

  Future<Map<String, dynamic>> _submitRequest(String sitePin) async {
    setState(() {
      _loading = true;
    });

    try {
      final response = await ApiService.purchasePins(
        serviceId: _selectedExamPlan!['id'].toString(),
        quantity: int.parse(_selectedQuantity),
        amount: ((_selectedExamPlan!['price'] ?? 0) as num).toDouble(),
        pin: sitePin,
      );
      return response;
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _onProceed() async {
    if (_selectedProviderKey == null) {
      AppToast.show(context, message: 'Please select an exam board', type: ToastType.warning);
      return;
    }
    if (_selectedExamPlan == null) {
      AppToast.show(context, message: 'Service temporarily unavailable for this exam', type: ToastType.warning);
      return;
    }
    if (!_formKey.currentState!.validate()) return;

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
      final errorMessage = result is Map ? (result['error'] ?? 'Purchase failed') : 'Purchase failed';

      if (isSuccess) {
        showLocalNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: 'Exam Pins Purchase Successful',
          body: 'Your purchase of $_selectedQuantity ${_selectedProviderKey!.toUpperCase()} pins was successful',
        );

        final pinData = result is Map && result['data'] != null ? result['data']['pinContent'] : null;
        
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => TransactionStatusScreen(
              isSuccess: true,
              title: 'Purchase Successful',
              message: 'Your exam pins were generated successfully.',
              details: {
                'Exam Board': _selectedProviderKey!.toUpperCase(),
                'Plan': _selectedExamPlan!['name'],
                'Quantity': '$_selectedQuantity Piece(s)',
                'Total Amount': '₦${formatCurrency(((_selectedExamPlan!['price'] ?? 0) as num).toDouble() * int.parse(_selectedQuantity))}',
                'Pins': pinData?.toString() ?? 'View in history',
              },
            ),
          ),
        );

        setState(() {
          _selectedExamPlan = null;
          _selectedProviderKey = null;
          _selectedQuantity = '1';
        });
      } else {
        showLocalNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: 'Exam Pins Purchase Failed',
          body: 'Failed to purchase pins: $errorMessage',
        );

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => TransactionStatusScreen(
              isSuccess: false,
              title: 'Purchase Failed',
              message: errorMessage,
              details: {
                'Exam Board': _selectedProviderKey!.toUpperCase(),
                'Quantity': '$_selectedQuantity Piece(s)',
              },
            ),
          ),
        );
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
                                'Exam Pins',
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

                    // Exam Board Selector
                    const Text(
                      'Select Exam Board',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 12),
                    if (_isLoadingPlans)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (_allPlans.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.orange.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, color: Colors.orange.shade700),
                            const SizedBox(width: 12),
                            const Expanded(child: Text('No exam pins available at the moment.')),
                          ],
                        ),
                      )
                    else
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: _examTypes.map((exam) {
                          bool isSelected = _selectedProviderKey == exam['provider_key'];
                          return GestureDetector(
                            onTap: () => _setProvider(exam['provider_key']),
                            child: Container(
                              width: MediaQuery.of(context).size.width * 0.4,
                              height: 120,
                              decoration: BoxDecoration(
                                color: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.05) : Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                  color: isSelected ? AppTheme.primaryColor : Colors.grey.shade200,
                                  width: isSelected ? 2 : 1,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(12),
                                    child: Image.asset(
                                      exam['assetPath'],
                                      width: 48,
                                      height: 48,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) => Icon(Icons.school, color: exam['color'], size: 48),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    exam['name'],
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
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

                    // Quantity Dropdown (1 to 5)
                    const Text(
                      'Quantity (Max 5)',
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
                      value: _selectedQuantity,
                      items: _quantities.map((q) {
                        return DropdownMenuItem(
                          value: q,
                          child: Text('$q Piece(s)'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            _selectedQuantity = val;
                          });
                        }
                      },
                    ),

                    const SizedBox(height: 40),

                    // Total Preview
                    if (_selectedExamPlan != null)
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total Amount',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                            ),
                            Text(
                              '₦${formatCurrency(((_selectedExamPlan!['price'] ?? 0) as num).toDouble() * int.parse(_selectedQuantity))}',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 40),

                    // Proceed Button
                    GradientButton(
                      text: 'Purchase Pin',
                      onPressed: _onProceed,
                      loading: _loading,
                    ),
                    const SizedBox(height: 40),
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
