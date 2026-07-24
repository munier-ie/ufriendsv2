import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

class NinServicesScreen extends StatefulWidget {
  final int? initialTab;
  const NinServicesScreen({super.key, this.initialTab});

  @override
  State<NinServicesScreen> createState() => _NinServicesScreenState();
}

class _NinServicesScreenState extends State<NinServicesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _ninAgreed = false;
  bool _loadingSettings = true;
  Map<String, dynamic>? _settings;
  List<dynamic> _history = [];
  bool _loadingHistory = false;
  final bool _submitting = false;
  Map<String, dynamic> _formData = {};

  // NIN Modification sub-type
  String? _ninModSubType;
  // NIN Validation sub-type
  String? _ninValSubType;

  static const _ninModOptions = [
    {'value': 'change_name', 'label': 'Change of Name'},
    {'value': 'arrange_name', 'label': 'Arrangement of Name'},
    {'value': 'change_dob', 'label': 'Correction of Date of Birth'},
    {'value': 'change_phone', 'label': 'Change of Phone Number'},
  ];

  static const _ninValOptions = [
    {'value': 'no_record', 'label': 'No Record Found'},
    {'value': 'sim', 'label': 'SIM Validation'},
    {'value': 'bank', 'label': 'Bank Validation'},
    {'value': 'vnin', 'label': 'VNIN Validation'},
  ];

  static const _serviceDisplay = {
    'NIN_MODIFICATION': 'NIN Modification',
    'NIN_VALIDATION': 'NIN Validation',
    'BVN_MODIFICATION': 'BVN Modification',
    'BVN_RETRIEVAL': 'BVN Retrieval',
    'VNIN_NIBSS': 'VNIN → NIBSS',
    'BVN_ANDROID': 'BVN Android License',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this, initialIndex: widget.initialTab ?? 0);
    _fetchSettings();
    _fetchHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchSettings() async {
    final res = await ApiService.fetchManualServicePricing();
    if (mounted) {
      setState(() {
        if (res['success'] == true) _settings = res['data'];
        _loadingSettings = false;
      });
    }
  }

  Future<void> _fetchHistory() async {
    setState(() => _loadingHistory = true);
    final res = await ApiService.fetchManualServiceHistory();
    if (mounted) {
      setState(() {
        if (res['success'] == true) _history = res['data'] ?? [];
        _loadingHistory = false;
      });
    }
  }

  double _currentPrice(String serviceType, String? subType) {
    if (_settings == null || _settings!['prices'] == null) return 0;
    final prices = _settings!['prices'] as List<dynamic>;
    final match = prices.firstWhere(
      (p) => p['serviceType'] == serviceType && p['subType'] == (subType ?? ''),
      orElse: () => null,
    );
    return match != null ? (match['price'] as num).toDouble() : 0;
  }

  bool _isServiceActive(String serviceType) {
    if (_settings == null) return true;
    final map = {
      'NIN_MODIFICATION': _settings!['ninModificationActive'],
      'NIN_VALIDATION': _settings!['ninValidationActive'],
    };
    return map[serviceType] ?? true;
  }

  String _formatPrice(double price) {
    return price.toInt().toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
  }

  Future<void> _submitRequest(String serviceType, String? subType) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          title: 'Confirm Request',
          onVerify: (pin) async {
            return await ApiService.submitManualService(
              serviceType: serviceType,
              subType: subType,
              details: _formData,
              pin: pin,
            );
          },
        ),
      ),
    );

    if (result != null && mounted) {
      if (result['success'] == true) {
        final msg = result['bvn'] != null
            ? 'BVN retrieved: ${result['bvn']}'
            : (result['message'] ?? 'Request submitted successfully');
        AppToast.show(context, message: msg, type: ToastType.success);
        setState(() {
          _formData = {};
          _ninModSubType = null;
          _ninValSubType = null;
        });
        _fetchHistory();
      } else {
        AppToast.show(context, message: result['error'] ?? 'Submission failed', type: ToastType.error);
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
                  // Tab Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Container(
                      height: 46,
                      decoration: BoxDecoration(
                        color: context.dividerColor,
                        borderRadius: BorderRadius.circular(23),
                      ),
                      child: TabBar(
                        controller: _tabController,
                        indicatorSize: TabBarIndicatorSize.tab,
                        indicator: BoxDecoration(
                          color: AppTheme.secondaryColor,
                          borderRadius: BorderRadius.circular(23),
                        ),
                        labelColor: Colors.white,
                        unselectedLabelColor: context.textSecondary,
                        labelStyle: const TextStyle(fontWeight: FontWeight.bold),
                        tabs: const [
                          Tab(text: 'Modification'),
                          Tab(text: 'Validation'),
                          Tab(text: 'History'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: _loadingSettings
                        ? const Center(child: CircularProgressIndicator())
                        : TabBarView(
                            controller: _tabController,
                            children: [
                              _buildModificationTab(),
                              _buildValidationTab(),
                              _buildHistoryTab(),
                            ],
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
              title: 'NIN Services',
              onBackPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
      ),
    );
  }

  // ── NIN Modification Tab ──
  Widget _buildModificationTab() {
    if (!_isServiceActive('NIN_MODIFICATION')) return _buildInactiveMessage();

    // Show agreement screen first
    if (!_ninAgreed) return _buildAgreementScreen();

    final price = _currentPrice('NIN_MODIFICATION', _ninModSubType ?? '');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Price display
          if (_ninModSubType != null) ...[
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
                  const Text('Service Fee', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  Text('₦${_formatPrice(price)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Sub-type selector
          _buildSectionLabel('Modification Type'),
          const SizedBox(height: 8),
          _buildBottomSheetSelector(
            value: _ninModSubType,
            placeholder: 'Select modification type',
            options: _ninModOptions,
            onSelect: (v) => setState(() {
              _ninModSubType = v;
              _formData = {'subType': v};
            }),
          ),

          if (_ninModSubType != null) ...[
            const SizedBox(height: 20),

            // NIN input
            _buildSectionLabel('NIN Number'),
            const SizedBox(height: 8),
            _buildTextInput(
              key: 'nin',
              hint: 'Enter 11-digit NIN',
              maxLength: 11,
              keyboardType: TextInputType.number,
            ),

            const SizedBox(height: 20),
            // Dynamic form fields
            ..._buildModificationFields(),

            const SizedBox(height: 24),
            GradientButton(
              text: 'Submit Request',
              icon: Icons.send_rounded,
              onPressed: _submitting ? () {} : () => _submitRequest('NIN_MODIFICATION', _ninModSubType),
              loading: _submitting,
            ),
          ],

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  List<Widget> _buildModificationFields() {
    final sub = _ninModSubType ?? '';
    final showName = ['change_name', 'arrange_name'].contains(sub);
    final showDob = sub == 'change_dob';
    final showPhone = sub == 'change_phone';

    List<Widget> widgets = [];

    if (showName) {
      widgets.addAll([
        _buildSectionLabel('Old Details'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'old_firstname', hint: 'Old First Name'),
        const SizedBox(height: 12),
        _buildTextInput(key: 'old_middlename', hint: 'Old Middle Name (Optional)'),
        const SizedBox(height: 12),
        _buildTextInput(key: 'old_lastname', hint: 'Old Last Name'),
        const SizedBox(height: 20),
        _buildSectionLabel('New Details'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'new_firstname', hint: 'New First Name'),
        const SizedBox(height: 12),
        _buildTextInput(key: 'new_middlename', hint: 'New Middle Name (Optional)'),
        const SizedBox(height: 12),
        _buildTextInput(key: 'new_lastname', hint: 'New Last Name'),
      ]);
    }

    if (showDob) {
      widgets.addAll([
        _buildSectionLabel('Old Date of Birth'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'old_dob', hint: 'DD-MM-YYYY', maxLength: 10),
        const SizedBox(height: 20),
        _buildSectionLabel('New Date of Birth'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'new_dob', hint: 'DD-MM-YYYY', maxLength: 10),
      ]);
    }

    if (showPhone) {
      widgets.addAll([
        _buildSectionLabel('Old Phone Number'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'old_phone', hint: '08012345678', maxLength: 15, keyboardType: TextInputType.phone),
        const SizedBox(height: 20),
        _buildSectionLabel('New Phone Number'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'new_phone', hint: '08012345678', maxLength: 15, keyboardType: TextInputType.phone),
      ]);
    }

    return widgets;
  }

  // ── NIN Validation Tab ──
  Widget _buildValidationTab() {
    if (!_isServiceActive('NIN_VALIDATION')) return _buildInactiveMessage();

    final price = _currentPrice('NIN_VALIDATION', _ninValSubType ?? '');

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_ninValSubType != null) ...[
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
                  const Text('Service Fee', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  Text('₦${_formatPrice(price)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          _buildSectionLabel('Validation Type'),
          const SizedBox(height: 8),
          _buildBottomSheetSelector(
            value: _ninValSubType,
            placeholder: 'Select validation type',
            options: _ninValOptions,
            onSelect: (v) => setState(() {
              _ninValSubType = v;
              _formData = {'subType': v};
            }),
          ),

          if (_ninValSubType != null) ...[
            const SizedBox(height: 20),
            _buildSectionLabel('NIN Number'),
            const SizedBox(height: 8),
            _buildTextInput(
              key: 'nin',
              hint: 'Enter 11-digit NIN',
              maxLength: 11,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 24),
            GradientButton(
              text: 'Submit Request',
              icon: Icons.verified_rounded,
              onPressed: _submitting ? () {} : () => _submitRequest('NIN_VALIDATION', _ninValSubType),
              loading: _submitting,
            ),
          ],

          const SizedBox(height: 24),
          // Info box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.info_outline_rounded, color: Colors.blue.shade700, size: 18),
                    const SizedBox(width: 8),
                    Text('How It Works', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade800, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 8),
                ...[
                  'Submit your request and pay the service fee.',
                  'Our agents will process your request.',
                  'Proof of completion will appear in your history.',
                ].map((t) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• ', style: TextStyle(color: Colors.blue.shade700)),
                      Expanded(child: Text(t, style: TextStyle(fontSize: 13, color: Colors.blue.shade800, height: 1.3))),
                    ],
                  ),
                )),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // ── History Tab ──
  Widget _buildHistoryTab() {
    if (_loadingHistory) return const Center(child: CircularProgressIndicator());

    // Filter to only NIN-related history
    final ninHistory = _history.where((r) =>
      r['serviceType'] == 'NIN_MODIFICATION' || r['serviceType'] == 'NIN_VALIDATION'
    ).toList();

    if (ninHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No Requests Yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
            const SizedBox(height: 8),
            Text('Your NIN service requests will appear here.', style: TextStyle(color: context.textMuted)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      triggerMode: RefreshIndicatorTriggerMode.anywhere,
      onRefresh: _fetchHistory,
      child: ListView.separated(
        padding: const EdgeInsets.all(24),
        itemCount: ninHistory.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final req = ninHistory[index];
          return _buildHistoryCard(req);
        },
      ),
    );
  }

  Widget _buildHistoryCard(dynamic req) {
    final status = req['status'] ?? 0;
    final statusInfo = _getStatusInfo(status);

    return GestureDetector(
      onTap: () => _showDetailsSheet(req),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.borderColor),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(req['transRef'] ?? '', style: TextStyle(fontSize: 11, color: context.iconMuted)),
                      const SizedBox(height: 2),
                      Text(
                        _serviceDisplay[req['serviceType']] ?? req['serviceType'] ?? '',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      if (req['subType'] != null)
                        Text(
                          (req['subType'] as String).replaceAll('_', ' '),
                          style: TextStyle(fontSize: 12, color: context.textSecondary),
                        ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (req['amount'] != null)
                      Text('₦${_formatPrice((req['amount'] as num).toDouble())}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusInfo['color'].withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(statusInfo['label'], style: TextStyle(color: statusInfo['color'], fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              req['createdAt'] != null ? DateTime.parse(req['createdAt']).toLocal().toString().substring(0, 16) : '',
              style: TextStyle(fontSize: 11, color: context.iconMuted),
            ),
            if (req['adminNote'] != null) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(8)),
                child: Text('Note: ${req['adminNote']}', style: TextStyle(fontSize: 12, color: Colors.amber.shade900)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showDetailsSheet(dynamic req) {
    final details = req['details'];
    Map<String, dynamic> detailsMap = {};
    if (details is String) {
      try {
        if (details.trim().startsWith('{')) {
          detailsMap = Map<String, dynamic>.from(jsonDecode(details));
        } else {
          detailsMap = Map<String, dynamic>.from(Uri.splitQueryString(details));
        }
      } catch (_) {}
    } else if (details is Map) {
      detailsMap = Map<String, dynamic>.from(details);
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.85,
        minChildSize: 0.4,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            children: [
              Center(
                child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
              ),
              const SizedBox(height: 20),
              const Text('Request Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _detailRow('Service', _serviceDisplay[req['serviceType']] ?? req['serviceType']),
              if (req['subType'] != null) _detailRow('Sub Type', (req['subType'] as String).replaceAll('_', ' ')),
              _detailRow('Status', _getStatusInfo(req['status'] ?? 0)['label']),
              if (req['amount'] != null) _detailRow('Amount', '₦${_formatPrice((req['amount'] as num).toDouble())}'),
              _detailRow('Date', req['createdAt'] != null ? DateTime.parse(req['createdAt']).toLocal().toString().substring(0, 16) : '-'),
              if (req['adminNote'] != null) _detailRow('Admin Note', req['adminNote']),
              if (detailsMap.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text('Submitted Data', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: context.subtleBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: context.borderColor),
                  ),
                  child: Column(
                    children: detailsMap.entries
                        .where((e) => e.key != 'idFileUrl' && e.key != 'subType')
                        .map((e) => _detailRow(
                          e.key.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m[0]}').replaceAll('_', ' ').trim(),
                          e.value?.toString() ?? 'N/A',
                        ))
                        .toList(),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: context.textSecondary)),
          const SizedBox(width: 16),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), textAlign: TextAlign.right, maxLines: 10, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }

  Map<String, dynamic> _getStatusInfo(int status) {
    switch (status) {
      case 1: return {'label': 'Approved', 'color': Colors.green};
      case 2: return {'label': 'Rejected', 'color': Colors.red};
      case 3: return {'label': 'In Progress', 'color': Colors.blue};
      default: return {'label': 'Pending', 'color': Colors.orange};
    }
  }

  // ── Agreement Screen (NIN Modification) ──
  Widget _buildAgreementScreen() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(color: Colors.blue.shade50, shape: BoxShape.circle),
            child: Icon(Icons.shield_rounded, size: 32, color: Colors.blue.shade600),
          ),
          const SizedBox(height: 16),
          Text('NIN Modification Agreement', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(
            'Read the following terms carefully before proceeding.',
            style: TextStyle(color: context.textSecondary, fontSize: 13),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.blue.shade100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                'I authorize this platform to access and modify my NIN record as requested.',
                'I understand this platform is not affiliated with NIMC but I give full consent for this platform to help me.',
                'NIMC recommends NIN modifications be done personally. By using this platform, I confirm I voluntarily authorize the modification on my behalf.',
                'I agree to pay the service fee and authorize the platform to use any method necessary to complete the modification.',
                'Alias Emails: This platform uses alias email addresses for all modifications.',
                'Modifications reflect immediately on NIMC and immigration portal, but banks and SIM providers may delay syncing.',
                'Wallet funds are non-withdrawable. Failed services are refunded to wallet.',
                'I will not submit the same request on another platform while it is being processed here.',
                'If submitting on behalf of someone else, I confirm the NIN owner has authorized me.',
              ].map((t) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('• ', style: TextStyle(color: Colors.blue.shade800, fontWeight: FontWeight.bold)),
                    Expanded(child: Text(t, style: TextStyle(fontSize: 13, color: Colors.blue.shade900, height: 1.4))),
                  ],
                ),
              )).toList(),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Colors.red),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Not Agree', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => setState(() => _ninAgreed = true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  child: const Text('I Agree', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildInactiveMessage() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.construction_rounded, size: 64, color: context.iconMuted),
          const SizedBox(height: 16),
          Text('Service Unavailable', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.grey.shade700)),
          const SizedBox(height: 8),
          Text('This service is currently disabled.', style: TextStyle(color: context.textSecondary)),
        ],
      ),
    );
  }

  // ── Shared Widgets ──

  Widget _buildSectionLabel(String text) => Text(
    text,
    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: context.textPrimary),
  );

  Widget _buildTextInput({
    required String key,
    required String hint,
    int? maxLength,
    TextInputType? keyboardType,
  }) {
    return TextFormField(
      initialValue: (_formData[key] ?? '').toString(),
      keyboardType: keyboardType,
      maxLength: maxLength,
      onChanged: (v) => _formData[key] = v,
      style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
      decoration: InputDecoration(
        hintText: hint,
        counterText: '',
      ),
    );
  }

  Widget _buildBottomSheetSelector({
    required String? value,
    required String placeholder,
    required List<Map<String, String>> options,
    required Function(String) onSelect,
  }) {
    final label = value != null
        ? options.firstWhere((o) => o['value'] == value, orElse: () => {'label': placeholder})['label']!
        : placeholder;

    return GestureDetector(
      onTap: () {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (ctx) => Container(
            decoration: BoxDecoration(
              color: context.bottomSheetBg,
              borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(height: 12),
                  Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
                  const SizedBox(height: 20),
                  Text(placeholder, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  ...options.map((opt) {
                    final selected = value == opt['value'];
                    return ListTile(
                      leading: Icon(
                        selected ? Icons.check_circle : Icons.circle_outlined,
                        color: selected ? AppTheme.primaryColor : Colors.grey.shade400,
                      ),
                      title: Text(opt['label']!, style: TextStyle(fontWeight: selected ? FontWeight.bold : FontWeight.normal)),
                      onTap: () {
                        onSelect(opt['value']!);
                        Navigator.pop(ctx);
                      },
                    );
                  }),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        );
      },
      child: AbsorbPointer(
        child: TextField(
          controller: TextEditingController(text: label),
          style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
          decoration: const InputDecoration(
            suffixIcon: Icon(Icons.arrow_drop_down),
          ),
        ),
      ),
    );
  }
}
