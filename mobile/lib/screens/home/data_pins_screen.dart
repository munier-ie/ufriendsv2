import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'transaction_status_screen.dart';
import '../../main.dart';

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
              decoration: BoxDecoration(
                color: context.bottomSheetBg,
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
                        fillColor: context.subtleBg,
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
        showLocalNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: 'Data Pins Purchase Successful',
          body: 'Your purchase of $_selectedQuantity $_selectedNetwork data pins was successful',
        );

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
        showLocalNotification(
          id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
          title: 'Data Pins Purchase Failed',
          body: 'Failed to purchase data pins: $errorMessage',
        );

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
      backgroundColor: context.cardColor,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.only(top: 68),
                child: Column(
                  children: [
                    Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.05),
                      Text(
                        'Data Cards (Pins)',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Generate data pins for offline recharge.',
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
                            onTap: () => _setNetwork(net['name']),
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

                      // Plan Selection
                      Text(
                        'Select Plan',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: _isLoadingPlans ? null : _showPlanPicker,
                        child: AbsorbPointer(
                          child: TextField(
                            controller: TextEditingController(text: _isLoadingPlans ? 'Loading plans...' : (_selectedDataPlan?['name'] ?? 'Select a plan')),
                            style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
                            decoration: const InputDecoration(
                              hintText: 'Select a plan',
                              suffixIcon: Icon(Icons.arrow_drop_down),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Quantity Dropdown (Alrahuz only supports 1, 2, 5 for data pins usually)
                      Text(
                        'Quantity',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          hintText: 'Select Quantity',
                        ),
                        initialValue: _selectedQuantity,
                        style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
                        items: _quantities.map((q) {
                          return DropdownMenuItem(
                            value: q,
                            child: Text(q, style: const TextStyle(fontWeight: FontWeight.normal)),
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
                      Text(
                        'Name on Card (Optional)',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _nameController,
                        style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
                        decoration: const InputDecoration(
                          hintText: 'Enter name to display on print',
                        ),
                      ),

                      const SizedBox(height: 32),

                      // Total Preview
                      if (_selectedDataPlan != null) ...[
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
                      ],

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
              ),
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: FloatingScreenHeader(
                title: 'Data Cards (Pins)',
                onBackPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
