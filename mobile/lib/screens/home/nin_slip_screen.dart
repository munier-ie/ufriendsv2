import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'slip_preview_screen.dart';

class NinSlipScreen extends StatefulWidget {
  const NinSlipScreen({super.key});

  @override
  State<NinSlipScreen> createState() => _NinSlipScreenState();
}

class _NinSlipScreenState extends State<NinSlipScreen> {
  final _controller = TextEditingController();
  String _lookupMethod = 'nin'; // 'nin' or 'phone'
  String? _slipType;
  bool _loading = false;
  Map<String, dynamic>? _pricing;

  final List<Map<String, dynamic>> _slipOptions = [
    {
      'key': 'regular',
      'label': 'Regular',
      'desc': 'Basic NIMC table format',
      'icon': Icons.receipt_long_rounded,
      'sample': 'assets/slip_samples/nin-regular.png',
    },
    {
      'key': 'standard',
      'label': 'Standard',
      'desc': 'ID card style with QR code',
      'icon': Icons.badge_rounded,
      'sample': 'assets/slip_samples/nin-standard.png',
    },
    {
      'key': 'premium',
      'label': 'Premium',
      'desc': 'Premium ID card design',
      'icon': Icons.credit_card_rounded,
      'sample': 'assets/slip_samples/nin-premium.png',
    },
    {
      'key': 'vnin',
      'label': 'VNIN',
      'desc': 'Virtual NIN verification report',
      'icon': Icons.qr_code_rounded,
      'sample': 'assets/slip_samples/nin-vnin.jpg',
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchPricing();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _fetchPricing() async {
    final res = await ApiService.getNinPricing();
    if (mounted && res['success'] == true) {
      setState(() => _pricing = res['data']);
    }
  }

  double _getPrice(String key) {
    if (_pricing == null) {
      const defaults = {'regular': 150.0, 'standard': 200.0, 'premium': 300.0, 'vnin': 1000.0};
      return defaults[key] ?? 150.0;
    }
    return ((_pricing![key] ?? 150) as num).toDouble();
  }

  void _showSamplePreview(String assetPath, String label) {
    showDialog(
      context: context,
      barrierColor: context.textPrimary,
      builder: (_) => SlipSamplePreviewDialog(assetPath: assetPath, label: label),
    );
  }

  void _showSlipTypePicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: context.bottomSheetBg,
            borderRadius: BorderRadius.only(
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
                  'Select Slip Type',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: _slipOptions.length,
                    itemBuilder: (context, index) {
                      final opt = _slipOptions[index];
                      final isSelected = _slipType == opt['key'];
                      return ListTile(
                        leading: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.asset(
                            opt['sample'],
                            width: 40,
                            height: 40,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => Icon(opt['icon'] as IconData, size: 40),
                          ),
                        ),
                        title: Text(opt['label'], style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('₦${formatCurrency(_getPrice(opt['key']))} - ${opt['desc']}', style: const TextStyle(fontSize: 12)),
                        trailing: isSelected 
                            ? const Icon(Icons.check_circle, color: AppTheme.primaryColor)
                            : null,
                        onTap: () {
                          setState(() {
                            _slipType = opt['key'];
                          });
                          Navigator.pop(context);
                          _showSamplePreview(opt['sample'], opt['label']);
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      },
    );
  }

  void _onSubmit() async {
    final value = _controller.text.trim();
    if (_lookupMethod == 'nin' && value.length != 11) {
      AppToast.show(context, message: 'NIN must be exactly 11 digits', type: ToastType.warning);
      return;
    }
    if (_lookupMethod == 'phone' && value.length < 10) {
      AppToast.show(context, message: 'Enter a valid phone number', type: ToastType.warning);
      return;
    }
    if (_slipType == null) {
      AppToast.show(context, message: 'Please select a slip type', type: ToastType.warning);
      return;
    }

    final details = _lookupMethod == 'phone'
        ? {'lookupMethod': 'phone', 'phoneNumber': value, 'slipType': _slipType}
        : {'nin': value, 'slipType': _slipType};

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
      if (result is Map && result['success'] == true) {
        final report = result['report'] as Map<String, dynamic>? ?? {};
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SlipPreviewScreen(
              report: report,
              slipType: 'nin',
              selectedSlipVariant: _slipType!,
            ),
          ),
        );
        _controller.clear();
      } else {
        final error = result is Map ? (result['error'] ?? 'Verification failed') : 'Verification failed';
        AppToast.show(context, message: error.toString(), type: ToastType.error);
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: MediaQuery.of(context).size.height * 0.05),
                    Text(
                      'NIN Slip Service',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Verify your NIN and generate a downloadable identity slip instantly.',
                      style: TextStyle(color: context.textSecondary, fontSize: 16),
                    ),
                    const SizedBox(height: 40),

                    // ── Lookup Method
                    _sectionLabel('Lookup Method'),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _toggleChip(
                            selected: _lookupMethod == 'nin',
                            label: 'NIN Number',
                            icon: Icons.tag_rounded,
                            onTap: () => setState(() => _lookupMethod = 'nin'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _toggleChip(
                            selected: _lookupMethod == 'phone',
                            label: 'Phone Number',
                            icon: Icons.phone_android_rounded,
                            onTap: () => setState(() => _lookupMethod = 'phone'),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // ── Input
                    _sectionLabel(_lookupMethod == 'nin' ? '11-Digit NIN' : 'Registered Phone Number'),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _controller,
                      keyboardType: TextInputType.number,
                      maxLength: _lookupMethod == 'nin' ? 11 : 14,
                      style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
                      decoration: _inputDecoration(
                        _lookupMethod == 'nin' ? 'e.g. 12345678901' : 'e.g. 08012345678',
                      ),
                    ),

                    const SizedBox(height: 24),

                    // ── Slip Type selector
                    _sectionLabel('Select Slip Type'),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: _showSlipTypePicker,
                      child: AbsorbPointer(
                        child: TextField(
                          controller: TextEditingController(
                            text: _slipType == null ? '' : _slipOptions.firstWhere((o) => o['key'] == _slipType)['label']
                          ),
                          style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
                          decoration: _inputDecoration('Select a slip type').copyWith(
                            suffixIcon: const Icon(Icons.arrow_drop_down),
                          ),
                        ),
                      ),
                    ),

                    if (_slipType != null) ...[
                      const SizedBox(height: 24),

                      // ── Price summary
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
                            const Text('Service Fee',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                            Text(
                              '₦${formatCurrency(_getPrice(_slipType!))}',
                              style: const TextStyle(
                                  fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 32),

                    GradientButton(
                      text: 'Verify & Generate NIN Slip',
                      icon: Icons.verified_rounded,
                      onPressed: _loading ? () {} : _onSubmit,
                      loading: _loading,
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: FloatingScreenHeader(
              title: 'NIN Slip Service',
              onBackPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text(text,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: context.textPrimary)),
      );

  InputDecoration _inputDecoration(String hint) => InputDecoration(
        hintText: hint,
        counterText: '',
      );

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
          color: selected ? AppTheme.primaryColor.withValues(alpha: 0.08) : context.subtleBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppTheme.primaryColor : context.borderColor,
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
}
