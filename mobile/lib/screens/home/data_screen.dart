import 'package:flutter/material.dart';
import 'package:flutter_native_contact_picker/flutter_native_contact_picker.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'transaction_status_screen.dart';
import '../../main.dart';

import '../../core/connectivity_service.dart';

class DataScreen extends StatefulWidget {
  const DataScreen({super.key});

  @override
  State<DataScreen> createState() => _DataScreenState();
}

class _DataScreenState extends State<DataScreen> {
  final _phoneController = TextEditingController();
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

  List<dynamic> _allPlans = [];
  List<dynamic> _filteredPlans = [];
  bool _isLoadingPlans = false;
  Map<String, dynamic>? _selectedDataPlan;
  String? _selectedDataType;

  static const List<String> _dataTypes = [
    'All Types',
    'SME',
    'Corporate Gifting',
    'Gifting',
    'Data Coupons',
    'Data Share',
    'Data Awoof',
  ];

  List<dynamic> _beneficiaries = [];
  bool _isLoadingBeneficiaries = false;

  @override
  void initState() {
    super.initState();
    _phoneController.addListener(_autoSelectNetwork);
    _fetchPlans();
    _loadBeneficiaries();
  }

  Future<void> _loadBeneficiaries() async {
    setState(() => _isLoadingBeneficiaries = true);
    final res = await ApiService.getBeneficiaries();
    if (res['success'] == true && mounted) {
      setState(() {
        _beneficiaries = res['beneficiaries']['beneficiaries'] ?? res['beneficiaries'];
        _isLoadingBeneficiaries = false;
      });
    } else if (mounted) {
      setState(() => _isLoadingBeneficiaries = false);
    }
  }

  Future<void> _fetchPlans() async {
    setState(() => _isLoadingPlans = true);
    final result = await ApiService.getServices('data');
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

  double? _parseDataSizeInMb(String name) {
    final match = RegExp(r'(\d+(\.\d+)?)\s*(MB|GB|TB)', caseSensitive: false).firstMatch(name);
    if (match == null) return null;
    final value = double.tryParse(match.group(1) ?? '0') ?? 0;
    final unit = (match.group(3) ?? '').toUpperCase();
    if (unit == 'GB') return value * 1024;
    if (unit == 'TB') return value * 1024 * 1024;
    return value; // in MB
  }

  bool _matchesDataType(String planName, String? type) {
    if (type == null || type.isEmpty || type == 'All Types') return true;
    final nameUpper = planName.toUpperCase();
    if (type == 'SME') return nameUpper.contains('SME');
    if (type == 'Corporate Gifting') return nameUpper.contains('CORPORATE') || nameUpper.contains('C.G') || nameUpper.contains('CG');
    if (type == 'Gifting') {
      return nameUpper.contains('GIFTING') &&
          !nameUpper.contains('CORPORATE') &&
          !nameUpper.contains('C.G') &&
          !nameUpper.contains('CG');
    }
    if (type == 'Data Coupons') return nameUpper.contains('COUPON');
    if (type == 'Data Share') return nameUpper.contains('SHARE');
    if (type == 'Data Awoof') return nameUpper.contains('AWOOF');
    return false;
  }

  void _filterPlans() {
    if (_selectedNetwork == null) {
      setState(() {
        _filteredPlans = [];
        _selectedDataPlan = null;
      });
      return;
    }
    setState(() {
      _filteredPlans = _allPlans.where((plan) {
        final provider = plan['provider']?.toString().toLowerCase();
        final selected = _selectedNetwork!.toLowerCase();
        if (provider != selected) return false;

        // Strip data plans outside 500MB to 10GB (500MB <= size <= 10240MB)
        final sizeInMb = _parseDataSizeInMb(plan['name']?.toString() ?? '');
        if (sizeInMb == null || sizeInMb < 500 || sizeInMb > 10240) {
          return false;
        }

        // Filter by data type
        if (!_matchesDataType(plan['name']?.toString() ?? '', _selectedDataType)) {
          return false;
        }

        return true;
      }).toList();

      // Sort data plans by size (ascending) and price
      _filteredPlans.sort((a, b) {
        final sizeA = _parseDataSizeInMb(a['name']?.toString() ?? '') ?? 999999;
        final sizeB = _parseDataSizeInMb(b['name']?.toString() ?? '') ?? 999999;
        if (sizeA != sizeB) {
          return sizeA.compareTo(sizeB);
        }
        final priceA = (a['price'] ?? 0) as num;
        final priceB = (b['price'] ?? 0) as num;
        return priceA.compareTo(priceB);
      });

      // Reset selection if current plan is no longer in filtered plans
      if (_selectedDataPlan != null && !_filteredPlans.any((p) => p['id'] == _selectedDataPlan!['id'])) {
        _selectedDataPlan = null;
      }
    });
  }

  List<Map<String, dynamic>> _getAvailableDataTypes() {
    if (_selectedNetwork == null) return [];

    final networkPlans = _allPlans.where((p) {
      final provider = p['provider']?.toString().toLowerCase();
      final selected = _selectedNetwork!.toLowerCase();
      if (provider != selected) return false;
      final sizeInMb = _parseDataSizeInMb(p['name']?.toString() ?? '');
      return sizeInMb != null && sizeInMb >= 500 && sizeInMb <= 10240;
    }).toList();

    List<Map<String, dynamic>> types = [];
    for (final type in _dataTypes) {
      final count = networkPlans.where((p) => _matchesDataType(p['name']?.toString() ?? '', type)).length;
      if (type == 'All Types' || count > 0) {
        types.add({
          'type': type,
          'count': count,
        });
      }
    }
    return types;
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
        _setNetwork('MTN');
      } else if (airtel.contains(prefix)) {
        _setNetwork('Airtel');
      } else if (glo.contains(prefix)) {
        _setNetwork('Glo');
      } else if (nineMobile.contains(prefix)) {
        _setNetwork('9mobile');
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

  void _setNetwork(String network) {
    if (_selectedNetwork != network) {
      setState(() {
        _selectedNetwork = network;
        _selectedDataType = null; // Reset data type on network change
        _filterPlans();
      });
    }
  }

  @override
  void dispose() {
    _phoneController.removeListener(_autoSelectNetwork);
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _showConfirmationDrawer() async {
    if (!await ConnectivityService.ensureOnline(context)) return;
    if (!mounted) return;
    if (_selectedNetwork == null || _phoneController.text.isEmpty || _selectedDataPlan == null) {
      AppToast.show(context, message: 'Please fill in all fields', type: ToastType.warning);
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
              decoration: BoxDecoration(
                color: context.bottomSheetBg,
                borderRadius: const BorderRadius.only(
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
                  if (_selectedDataType != null)
                    _detailRow('Data Type', _selectedDataType!),
                  _detailRow('Phone Number', _phoneController.text),
                  _detailRow('Plan', _selectedDataPlan!['name'] ?? 'N/A'),
                  _detailRow('Amount', '₦${formatCurrency((_selectedDataPlan!['price'] ?? 0).toDouble())}'),
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
                              
                              final planName = _selectedDataPlan?['name'] ?? '';
                              final recipient = _phoneController.text;
                              final amount = '₦${_selectedDataPlan?['price'] ?? 0}';
                              
                              if (isSuccess) {
                                showLocalNotification(
                                  id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
                                  title: 'Data Purchase Successful',
                                  body: 'You have successfully purchased $planName for $recipient',
                                );
                              } else {
                                showLocalNotification(
                                  id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
                                  title: 'Data Purchase Failed',
                                  body: 'Failed to purchase data: $errorMessage',
                                );
                              }
                              
                              final dataType = _selectedDataType;
                              
                              navigator.push(
                                MaterialPageRoute(
                                  builder: (_) => TransactionStatusScreen(
                                    isSuccess: isSuccess,
                                    title: isSuccess ? 'Transaction Successful' : 'Transaction Failed',
                                    message: isSuccess 
                                        ? 'Your data purchase was successful.' 
                                        : errorMessage,
                                    details: isSuccess ? {
                                      'Service': 'Data Purchase',
                                      'Type': ?dataType,
                                      'Plan': planName,
                                      'Recipient': recipient,
                                      'Amount': amount,
                                    } : null,
                                  ),
                                ),
                              );
                              
                              if (isSuccess) {
                                _phoneController.clear();
                                setState(() {
                                  _selectedDataPlan = null;
                                  _selectedDataType = null;
                                  _selectedNetwork = null;
                                  _filteredPlans = [];
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
    final response = await ApiService.purchaseService(
      serviceId: _selectedDataPlan!['serviceId'] ?? _selectedDataPlan!['id'].toString(),
      recipient: _phoneController.text,
      amount: (_selectedDataPlan!['price'] ?? 0).toDouble(),
      pin: pin,
      networkType: _selectedDataType ?? _selectedNetwork,
    );

    return response;
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

  void _showDataTypePicker() {
    if (_selectedNetwork == null) {
      AppToast.show(context, message: 'Please select a network first', type: ToastType.warning);
      return;
    }

    final availableTypes = _getAvailableDataTypes();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: context.bottomSheetBg,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
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
                  'Select Data Type',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: availableTypes.length,
                    itemBuilder: (context, index) {
                      final item = availableTypes[index];
                      final type = item['type'] as String;
                      final count = item['count'] as int;
                      final isSelected = (_selectedDataType == null && type == 'All Types') || _selectedDataType == type;

                      return ListTile(
                        title: Text(
                          type,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? AppTheme.primaryColor : context.textPrimary,
                          ),
                        ),
                        subtitle: Text(
                          type == 'All Types' ? '$count plans available' : '$count plans',
                          style: TextStyle(fontSize: 12, color: context.textSecondary),
                        ),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle, color: AppTheme.primaryColor)
                            : null,
                        onTap: () {
                          setState(() {
                            _selectedDataType = (type == 'All Types') ? null : type;
                            _filterPlans();
                          });
                          Navigator.pop(context);
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showPlanPicker() {
    if (_selectedNetwork == null) {
      AppToast.show(context, message: 'Please select a network first', type: ToastType.warning);
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
                borderRadius: const BorderRadius.only(
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
                    'Select Data Plan',
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
                    child: filtered.isEmpty
                        ? Center(
                            child: Text(
                              'No plans found in 500MB - 10GB range',
                              style: TextStyle(color: context.textSecondary),
                            ),
                          )
                        : ListView.builder(
                            itemCount: filtered.length,
                            itemBuilder: (context, index) {
                              final plan = filtered[index];
                              return ListTile(
                                title: Text(plan['name'] ?? 'N/A'),
                                subtitle: Text('₦${formatCurrency((plan['price'] ?? 0).toDouble())}'),
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
                        'Top up your data plan quickly and easily.',
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
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Phone Number',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
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
                  prefixIcon: Icon(Icons.phone_android_rounded),
                ),
              ),
              if (_isLoadingBeneficiaries)
                const Padding(
                  padding: EdgeInsets.only(top: 8.0),
                  child: Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
                )
              else if (_beneficiaries.isNotEmpty) ...[
                const SizedBox(height: 12),
                SizedBox(
                  height: 40,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _beneficiaries.length,
                    itemBuilder: (context, index) {
                      final b = _beneficiaries[index];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ActionChip(
                          avatar: const Icon(Icons.person, size: 16),
                          label: Text('${b['name']}'),
                          onPressed: () {
                            _phoneController.text = b['phone'];
                            _autoSelectNetwork();
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
              const SizedBox(height: 24),

              Text(
                'Data Type',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _isLoadingPlans ? null : _showDataTypePicker,
                child: AbsorbPointer(
                  child: TextField(
                    controller: TextEditingController(
                      text: _isLoadingPlans
                          ? 'Loading...'
                          : (_selectedDataType ?? 'All Types'),
                    ),
                    decoration: const InputDecoration(
                      hintText: 'Select Data Type',
                      suffixIcon: Icon(Icons.arrow_drop_down),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              
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
                    decoration: const InputDecoration(
                      hintText: 'Select a plan',
                      suffixIcon: Icon(Icons.arrow_drop_down),
                    ),
                  ),
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
    title: 'Buy Data',
    onBackPressed: () => Navigator.pop(context),
  ),
),
],
),
),
);
}
}
