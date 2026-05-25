import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'slip_preview_screen.dart';

class GovServicesScreen extends StatefulWidget {
  const GovServicesScreen({super.key});

  @override
  State<GovServicesScreen> createState() => _GovServicesScreenState();
}

class _GovServicesScreenState extends State<GovServicesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _loading = false;

  // ── BVN state
  final _bvnController = TextEditingController();
  String _bvnSlipType = 'regular';
  Map<String, dynamic>? _bvnPricing;

  // ── NIN state
  final _ninController = TextEditingController();
  String _ninLookupMethod = 'nin'; // 'nin' or 'phone'
  String _ninSlipType = 'regular';
  Map<String, dynamic>? _ninPricing;

  bool _loadingPricing = false;

  final List<Map<String, dynamic>> _bvnSlipOptions = [
    {
      'key': 'regular',
      'label': 'Regular Slip',
      'desc': 'Basic table format with all verified details',
      'icon': Icons.receipt_long_rounded,
    },
    {
      'key': 'plastic',
      'label': 'Premium Plastic',
      'desc': 'Card-style premium design for printing',
      'icon': Icons.credit_card_rounded,
    },
  ];

  final List<Map<String, dynamic>> _ninSlipOptions = [
    {
      'key': 'regular',
      'label': 'Regular',
      'desc': 'Basic NIMC table format',
      'icon': Icons.receipt_long_rounded,
    },
    {
      'key': 'standard',
      'label': 'Standard',
      'desc': 'ID card style with QR code',
      'icon': Icons.badge_rounded,
    },
    {
      'key': 'premium',
      'label': 'Premium',
      'desc': 'Premium ID card design',
      'icon': Icons.credit_card_rounded,
    },
    {
      'key': 'vnin',
      'label': 'VNIN',
      'desc': 'Virtual NIN verification report',
      'icon': Icons.qr_code_rounded,
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        if (_tabController.index == 0) _fetchNinPricing();
        if (_tabController.index == 1) _fetchBvnPricing();
      }
    });
    _fetchNinPricing();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _bvnController.dispose();
    _ninController.dispose();
    super.dispose();
  }

  Future<void> _fetchBvnPricing() async {
    if (_bvnPricing != null) return;
    setState(() => _loadingPricing = true);
    final res = await ApiService.getBvnPricing();
    if (mounted) {
      setState(() {
        _loadingPricing = false;
        if (res['success'] == true) _bvnPricing = res['data'];
      });
    }
  }

  Future<void> _fetchNinPricing() async {
    if (_ninPricing != null) return;
    setState(() => _loadingPricing = true);
    final res = await ApiService.getNinPricing();
    if (mounted) {
      setState(() {
        _loadingPricing = false;
        if (res['success'] == true) _ninPricing = res['data'];
      });
    }
  }

  double _getBvnPrice() {
    if (_bvnPricing == null) return _bvnSlipType == 'plastic' ? 1000 : 500;
    final key = _bvnSlipType == 'plastic' ? 'plastic' : 'regular';
    return ((_bvnPricing![key] ?? _bvnPricing!['userPrice'] ?? 500) as num).toDouble();
  }

  double _getNinPrice() {
    if (_ninPricing == null) {
      final defaults = {'regular': 150.0, 'standard': 200.0, 'premium': 300.0, 'vnin': 1000.0};
      return defaults[_ninSlipType] ?? 150.0;
    }
    return ((_ninPricing![_ninSlipType] ?? _ninPricing!['userPrice'] ?? 150) as num).toDouble();
  }

  void _onSubmitBvn() async {
    final bvn = _bvnController.text.trim();
    if (bvn.length != 11) {
      AppToast.show(context, message: 'BVN must be exactly 11 digits', type: ToastType.warning);
      return;
    }

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          title: 'Enter Transaction PIN',
          onVerify: (pin) async {
            setState(() => _loading = true);
            try {
              final res = await ApiService.submitProfessionalRequest(
                type: 'BVN_SLIP_SERVICE',
                details: {'bvnNumber': bvn, 'slipType': _bvnSlipType},
                pin: pin,
              );
              return res;
            } finally {
              if (mounted) setState(() => _loading = false);
            }
          },
        ),
      ),
    );

    if (result != null && mounted) {
      final isSuccess = result is Map && result['success'] == true;
      if (isSuccess) {
        final report = result['report'] as Map<String, dynamic>? ?? {};
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SlipPreviewScreen(
              report: report,
              slipType: 'bvn',
              selectedSlipVariant: _bvnSlipType,
            ),
          ),
        );
        _bvnController.clear();
      } else {
        final error = result is Map ? (result['error'] ?? 'Verification failed') : 'Verification failed';
        AppToast.show(context, message: error.toString(), type: ToastType.error);
      }
    }
  }

  void _onSubmitNin() async {
    final nin = _ninController.text.trim();
    if (_ninLookupMethod == 'nin' && nin.length != 11) {
      AppToast.show(context, message: 'NIN must be exactly 11 digits', type: ToastType.warning);
      return;
    }
    if (_ninLookupMethod == 'phone' && nin.length < 10) {
      AppToast.show(context, message: 'Enter a valid phone number', type: ToastType.warning);
      return;
    }

    final details = _ninLookupMethod == 'phone'
        ? {'lookupMethod': 'phone', 'phoneNumber': nin, 'slipType': _ninSlipType}
        : {'nin': nin, 'slipType': _ninSlipType};

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          title: 'Enter Transaction PIN',
          onVerify: (pin) async {
            setState(() => _loading = true);
            try {
              return await ApiService.submitProfessionalRequest(
                type: 'NIN_SLIP_SERVICE',
                details: details,
                pin: pin,
              );
            } finally {
              if (mounted) setState(() => _loading = false);
            }
          },
        ),
      ),
    );

    if (result != null && mounted) {
      final isSuccess = result is Map && result['success'] == true;
      if (isSuccess) {
        final report = result['report'] as Map<String, dynamic>? ?? {};
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SlipPreviewScreen(
              report: report,
              slipType: 'nin',
              selectedSlipVariant: _ninSlipType,
            ),
          ),
        );
        _ninController.clear();
      } else {
        final error = result is Map ? (result['error'] ?? 'Verification failed') : 'Verification failed';
        AppToast.show(context, message: error.toString(), type: ToastType.error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          Container(
            height: 260,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF004687), Color(0xFF1E90FF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                // App bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                      const Expanded(
                        child: Text(
                          'Gov & Identity Services',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 8),

                // Subtitle
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    'Verify your NIN or BVN and generate a downloadable identity slip instantly.',
                    style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                  ),
                ),

                const SizedBox(height: 16),

                // Tabs
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(13),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: const Color(0xFF004687),
                      unselectedLabelColor: Colors.white,
                      labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      tabs: const [
                        Tab(text: '🪪  NIN Slip'),
                        Tab(text: '🏦  BVN Slip'),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Tab views
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildNinTab(),
                      _buildBvnTab(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ──────────────────────── NIN TAB ────────────────────────────────────────

  Widget _buildNinTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Lookup method toggle
          _sectionLabel('Lookup Method'),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _toggleChip(
                  selected: _ninLookupMethod == 'nin',
                  label: 'NIN Number',
                  icon: Icons.tag_rounded,
                  onTap: () => setState(() => _ninLookupMethod = 'nin'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _toggleChip(
                  selected: _ninLookupMethod == 'phone',
                  label: 'Phone Number',
                  icon: Icons.phone_android_rounded,
                  onTap: () => setState(() => _ninLookupMethod = 'phone'),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Input
          _sectionLabel(_ninLookupMethod == 'nin' ? '11-Digit NIN' : 'Registered Phone Number'),
          const SizedBox(height: 8),
          TextField(
            controller: _ninController,
            keyboardType: TextInputType.number,
            maxLength: _ninLookupMethod == 'nin' ? 11 : 14,
            decoration: _inputDecoration(
              _ninLookupMethod == 'nin' ? 'e.g. 12345678901' : 'e.g. 08012345678',
            ),
          ),

          const SizedBox(height: 20),

          // Slip type
          _sectionLabel('Select Slip Type'),
          const SizedBox(height: 8),
          ..._ninSlipOptions.map((opt) => _slipOptionTile(
            key: opt['key'],
            label: opt['label'],
            desc: opt['desc'],
            icon: opt['icon'],
            price: _getNinPriceFor(opt['key']),
            selected: _ninSlipType == opt['key'],
            onTap: () => setState(() => _ninSlipType = opt['key']),
          )),

          const SizedBox(height: 20),
          _priceBox(_getNinPrice()),
          const SizedBox(height: 16),

          GradientButton(
            text: 'Verify & Generate NIN Slip',
            icon: Icons.verified_rounded,
            onPressed: _loading ? () {} : _onSubmitNin,
            loading: _loading,
          ),
        ],
      ),
    );
  }

  double _getNinPriceFor(String key) {
    if (_ninPricing == null) {
      final defaults = {'regular': 150.0, 'standard': 200.0, 'premium': 300.0, 'vnin': 1000.0};
      return defaults[key] ?? 150.0;
    }
    return ((_ninPricing![key] ?? 150) as num).toDouble();
  }

  // ──────────────────────── BVN TAB ────────────────────────────────────────

  Widget _buildBvnTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('11-Digit BVN'),
          const SizedBox(height: 8),
          TextField(
            controller: _bvnController,
            keyboardType: TextInputType.number,
            maxLength: 11,
            decoration: _inputDecoration('e.g. 22312345678'),
          ),

          const SizedBox(height: 20),

          _sectionLabel('Select Slip Type'),
          const SizedBox(height: 8),
          ..._bvnSlipOptions.map((opt) => _slipOptionTile(
            key: opt['key'],
            label: opt['label'],
            desc: opt['desc'],
            icon: opt['icon'],
            price: opt['key'] == 'plastic' ? (_bvnPricing == null ? 1000 : ((_bvnPricing!['plastic'] ?? 1000) as num).toDouble()) : _getBvnPrice(),
            selected: _bvnSlipType == opt['key'],
            onTap: () => setState(() => _bvnSlipType = opt['key']),
          )),

          const SizedBox(height: 20),
          _priceBox(_getBvnPrice()),
          const SizedBox(height: 16),

          GradientButton(
            text: 'Verify & Generate BVN Slip',
            icon: Icons.verified_rounded,
            onPressed: _loading ? () {} : _onSubmitBvn,
            loading: _loading,
          ),
        ],
      ),
    );
  }

  // ──────────────────────── Common widgets ─────────────────────────────────

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      counterText: '',
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
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  Widget _toggleChip({
    required bool selected,
    required String label,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primaryColor.withValues(alpha: 0.08) : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppTheme.primaryColor : Colors.grey.shade200,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: selected ? AppTheme.primaryColor : Colors.grey),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                  color: selected ? AppTheme.primaryColor : Colors.black54,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _slipOptionTile({
    required String key,
    required String label,
    required String desc,
    required IconData icon,
    required double price,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primaryColor.withValues(alpha: 0.05) : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? AppTheme.primaryColor : Colors.grey.shade200,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: selected ? AppTheme.primaryColor : Colors.grey.shade200,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: selected ? Colors.white : Colors.grey.shade600, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: selected ? AppTheme.primaryColor : Colors.black87)),
                  Text(desc, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('₦${formatCurrency(price)}',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: selected ? AppTheme.primaryColor : Colors.black87)),
                if (selected)
                  const Icon(Icons.check_circle_rounded, color: AppTheme.primaryColor, size: 16),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _priceBox(double price) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('Service Fee', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          Text(
            '₦${formatCurrency(price)}',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
          ),
        ],
      ),
    );
  }
}
