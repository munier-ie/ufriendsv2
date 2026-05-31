import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';
import 'slip_preview_screen.dart';

class BvnSlipScreen extends StatefulWidget {
  const BvnSlipScreen({super.key});

  @override
  State<BvnSlipScreen> createState() => _BvnSlipScreenState();
}

class _BvnSlipScreenState extends State<BvnSlipScreen> {
  final _controller = TextEditingController();
  String? _slipType;
  bool _loading = false;
  Map<String, dynamic>? _pricing;

  final List<Map<String, dynamic>> _slipOptions = [
    {
      'key': 'regular',
      'label': 'Regular',
      'desc': 'Basic table format for verification',
      'icon': Icons.receipt_long_rounded,
      'sample': 'assets/slip_samples/bvn-regular.jpeg',
    },
    {
      'key': 'plastic',
      'label': 'Premium Plastic',
      'desc': 'Card-style premium design for printing',
      'icon': Icons.credit_card_rounded,
      'sample': 'assets/slip_samples/bvn-plastic.jpg',
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
    final res = await ApiService.getBvnPricing();
    if (mounted && res['success'] == true) {
      setState(() => _pricing = res['data']);
    }
  }

  double _getPrice(String key) {
    if (_pricing == null) {
      return key == 'plastic' ? 1000.0 : 500.0;
    }
    return ((_pricing![key] ?? _pricing!['userPrice'] ?? 500) as num).toDouble();
  }

  void _showSamplePreview(String assetPath, String label) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
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
          decoration: const BoxDecoration(
            color: Colors.white,
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
    final bvn = _controller.text.trim();
    if (bvn.length != 11) {
      AppToast.show(context, message: 'BVN must be exactly 11 digits', type: ToastType.warning);
      return;
    }
    if (_slipType == null) {
      AppToast.show(context, message: 'Please select a slip type', type: ToastType.warning);
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
              return await ApiService.submitProfessionalRequest(
                type: 'BVN_SLIP_SERVICE',
                details: {'bvnNumber': bvn, 'slipType': _slipType},
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
              slipType: 'bvn',
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
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          Container(
            height: 240,
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
                          'BVN Slip Service',
                          style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    'Verify your BVN and generate a premium bank verification slip instantly.',
                    style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                  ),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 40),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ── BVN Input
                        _sectionLabel('11-Digit BVN'),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _controller,
                          keyboardType: TextInputType.number,
                          maxLength: 11,
                          decoration: _inputDecoration('e.g. 22312345678'),
                        ),

                        const SizedBox(height: 20),

                        // ── Slip type selector
                        _sectionLabel('Select Slip Type'),
                        const SizedBox(height: 8),
                        GestureDetector(
                          onTap: _showSlipTypePicker,
                          child: AbsorbPointer(
                            child: TextField(
                              controller: TextEditingController(
                                text: _slipType == null ? '' : _slipOptions.firstWhere((o) => o['key'] == _slipType)['label']
                              ),
                              decoration: _inputDecoration('Select a slip type').copyWith(
                                suffixIcon: const Icon(Icons.arrow_drop_down),
                              ),
                            ),
                          ),
                        ),

                        if (_slipType != null) ...[
                          const SizedBox(height: 20),

                          // Price summary
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
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      color: AppTheme.primaryColor),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 16),

                        GradientButton(
                          text: 'Verify & Generate BVN Slip',
                          icon: Icons.verified_rounded,
                          onPressed: _loading ? () {} : _onSubmit,
                          loading: _loading,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text(text,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87)),
      );

  InputDecoration _inputDecoration(String hint) => InputDecoration(
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
