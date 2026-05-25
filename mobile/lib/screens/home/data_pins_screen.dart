import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'transaction_status_screen.dart';

class DataPinsScreen extends StatefulWidget {
  const DataPinsScreen({super.key});

  @override
  State<DataPinsScreen> createState() => _DataPinsScreenState();
}

class _DataPinsScreenState extends State<DataPinsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _quantityController = TextEditingController(text: '1');
  final _nameController = TextEditingController();
  
  String? _selectedNetwork;
  Map<String, dynamic>? _selectedDataPlan;
  bool _loading = false;
  bool _isLoadingPlans = false;
  
  List<dynamic> _allPlans = [];
  List<dynamic> _filteredPlans = [];

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

  final List<String> _quantities = ['1', '2', '5'];
  String _selectedQuantity = '1';

  @override
  void initState() {
    super.initState();
    _fetchPlans();
  }

  Future<void> _fetchPlans() async {
    setState(() => _isLoadingPlans = true);
    // Fetch data pin services specifically (type 'data_pin' in the backend)
    // If none exist, the admin must add them via the dashboard.
    final result = await ApiService.getServices('data_pin');
    if (mounted) {
      setState(() {
        _isLoadingPlans = false;
        if (result['success']) {
          _allPlans = result['services'];
          _filterPlans();
        }
      });
    }
  }

  void _filterPlans() {
    if (_selectedNetwork == null) {
      _filteredPlans = [];
      return;
    }
    setState(() {
      _filteredPlans = _allPlans.where((plan) {
        final provider = plan['provider']?.toString().toLowerCase();
        final selected = _selectedNetwork!.toLowerCase();
        return provider == selected;
      }).toList();
      _selectedDataPlan = null;
    });
  }

  void _setNetwork(String network) {
    if (_selectedNetwork != network) {
      setState(() {
        _selectedNetwork = network;
        _filterPlans();
      });
    }
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<Map<String, dynamic>> _submitRequest(String sitePin) async {
    setState(() {
      _loading = true;
    });

    try {
      final response = await ApiService.purchasePins(
        serviceId: _selectedDataPlan!['id'].toString(),
        quantity: int.parse(_selectedQuantity),
        amount: ((_selectedDataPlan!['price'] ?? 0) as num).toDouble(),
        pin: sitePin,
        businessName: _nameController.text.isNotEmpty ? _nameController.text : null,
      );
      return response;
    } catch (e) {
      return {'success': false, 'error': 'Network error occurred'};
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  void _showPlanPicker() {
    if (_selectedNetwork == null) {
      AppToast.show(context, message: 'Please select a network first', type: ToastType.warning);
      return;
    }

    if (_filteredPlans.isEmpty) {
      AppToast.show(context, message: 'No data pins available for this network', type: ToastType.warning);
      return;
    }

    List<dynamic> filtered = List.from(_filteredPlans);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              height: MediaQuery.of(context).size.height * 0.7,
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Column(
                children: [
                  const SizedBox(height: 12),
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Select Data Pin',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: 'Search plan...',
                        prefixIcon: const Icon(Icons.search),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onChanged: (val) {
                        setModalState(() {
                          filtered = _filteredPlans
                              .where((plan) => plan['name'].toString().toLowerCase().contains(val.toLowerCase()))
                              .toList();
                        });
                      },
                    ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final plan = filtered[index];
                        return ListTile(
                          title: Text(plan['name'] ?? 'N/A'),
                          subtitle: Text('₦${formatCurrency(((plan['price'] ?? 0) as num).toDouble())}'),
                          trailing: _selectedDataPlan?['id'] == plan['id'] 
                              ? const Icon(Icons.check_circle, color: Color(0xFF1E90FF))
                              : null,
                          onTap: () {
                            setState(() {
                              _selectedDataPlan = plan;
                            });
                            Navigator.pop(context);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _onProceed() async {
    if (_selectedNetwork == null) {
      AppToast.show(context, message: 'Please select a network', type: ToastType.warning);
      return;
    }
    if (_selectedDataPlan == null) {
      AppToast.show(context, message: 'Please select a plan', type: ToastType.warning);
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
      final errorMessage = result is Map ? (result['error'] ?? 'Purchase failed') : 'Purchase failed';

      if (isSuccess) {
        final pinData = result is Map && result['data'] != null ? result['data']['pinContent'] : null;
        
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => TransactionStatusScreen(
              isSuccess: true,
              title: 'Purchase Successful',
              message: 'Your data pins were generated successfully.',
              details: {
                'Network': _selectedNetwork!,
                'Plan': _selectedDataPlan!['name'],
                'Quantity': _selectedQuantity,
                'Total Amount': '₦${formatCurrency(((_selectedDataPlan!['price'] ?? 0) as num).toDouble() * int.parse(_selectedQuantity))}',
                'Pins': pinData?.toString() ?? 'View in history',
              },
            ),
          ),
        );

        setState(() {
          _selectedDataPlan = null;
          _selectedNetwork = null;
          _filteredPlans = [];
          _selectedQuantity = '1';
          _nameController.clear();
        });
      } else {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => TransactionStatusScreen(
              isSuccess: false,
              title: 'Purchase Failed',
              message: errorMessage,
              details: {
                'Network': _selectedNetwork!,
                'Plan': _selectedDataPlan!['name'],
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
                                'Data Cards (Pins)',
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: _networks.map((net) {
                        bool isSelected = _selectedNetwork == net['name'];
                        return GestureDetector(
                          onTap: () => _setNetwork(net['name']),
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

                    const SizedBox(height: 24),

                    // Plan Selection
                    const Text(
                      'Select Plan',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const SizedBox(height: 12),
                    GestureDetector(
                      onTap: _isLoadingPlans ? null : _showPlanPicker,
                      child: AbsorbPointer(
                        child: TextField(
                          controller: TextEditingController(text: _isLoadingPlans ? 'Loading plans...' : (_selectedDataPlan?['name'] ?? 'Select a plan')),
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            hintText: 'Select a plan',
                            suffixIcon: const Icon(Icons.arrow_drop_down),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(color: Colors.grey.shade200),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(color: Colors.grey.shade200),
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Quantity Dropdown (Alrahuz only supports 1, 2, 5 for data pins usually)
                    const Text(
                      'Quantity',
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
                          child: Text(q),
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

                    const SizedBox(height: 24),

                    // Name on Card
                    const Text(
                      'Name on Card (Optional)',
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
                    ),

                    const SizedBox(height: 32),

                    // Total Preview
                    if (_selectedDataPlan != null)
                      Container(
                        padding: const EdgeInsets.all(16),
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
                              '₦${formatCurrency(((_selectedDataPlan!['price'] ?? 0) as num).toDouble() * int.parse(_selectedQuantity))}',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 32),

                    // Proceed Button
                    GradientButton(
                      text: 'Generate Data Pins',
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
