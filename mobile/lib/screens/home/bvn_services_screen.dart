import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

import '../../core/connectivity_service.dart';

class BvnServicesScreen extends StatefulWidget {
  final String? initialService;
  const BvnServicesScreen({super.key, this.initialService});

  @override
  State<BvnServicesScreen> createState() => _BvnServicesScreenState();
}

class _BvnServicesScreenState extends State<BvnServicesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _loadingSettings = true;
  Map<String, dynamic>? _settings;
  List<dynamic> _history = [];
  bool _loadingHistory = false;
  final bool _submitting = false;
  bool _uploading = false;
  Map<String, dynamic> _formData = {};

  String _activeService = 'BVN_MODIFICATION';
  String? _bvnModSubType;

  final ImagePicker _picker = ImagePicker();

  static const _bvnModOptions = [
    {'value': 'change_name', 'label': 'Change of Name'},
    {'value': 'arrange_name', 'label': 'Arrangement of Name'},
    {'value': 'change_dob', 'label': 'Correction of Date of Birth'},
    {'value': 'change_phone', 'label': 'Change of Phone Number'},
    {'value': 'name_dob', 'label': 'Change of Name & Date of Birth'},
    {'value': 'dob_phone', 'label': 'Date of Birth & Phone Number'},
    {'value': 'name_phone', 'label': 'Name & Phone Number'},
    {'value': 'name_dob_phone', 'label': 'Name, Date of Birth & Phone'},
  ];

  static const _idTypeOptions = [
    {'value': 'nin', 'label': 'NIN (National Identity Number)'},
    {'value': 'voters_card', 'label': "Voter's Card"},
    {'value': 'driving_license', 'label': 'Driving License'},
    {'value': 'international_passport', 'label': 'International Passport'},
  ];

  static const _geoZones = ['North Central', 'North East', 'North West', 'South East', 'South South', 'South West'];

  static const _serviceLabels = {
    'BVN_MODIFICATION': 'BVN Modification',
    'BVN_RETRIEVAL': 'BVN Retrieval',
    'VNIN_NIBSS': 'VNIN → NIBSS',
    'BVN_ANDROID': 'BVN Android License',
  };

  static const _allServiceDisplay = {
    'BVN_MODIFICATION': 'BVN Modification',
    'BVN_RETRIEVAL': 'BVN Retrieval',
    'VNIN_NIBSS': 'VNIN → NIBSS',
    'BVN_ANDROID': 'BVN Android License',
    'NIN_MODIFICATION': 'NIN Modification',
    'NIN_VALIDATION': 'NIN Validation',
  };

  @override
  void initState() {
    super.initState();
    if (widget.initialService != null) {
      _activeService = widget.initialService!;
    }
    _tabController = TabController(length: 2, vsync: this);
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
      'BVN_MODIFICATION': _settings!['bvnModificationActive'],
      'BVN_RETRIEVAL': _settings!['bvnRetrievalActive'],
      'VNIN_NIBSS': _settings!['vninNibssActive'],
      'BVN_ANDROID': _settings!['bvnAndroidActive'],
    };
    return map[serviceType] ?? true;
  }

  String _formatPrice(double price) {
    return price.toInt().toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
  }

  void _updateField(String key, dynamic value) {
    setState(() => _formData[key] = value);
  }

  void _switchService(String svc) {
    setState(() {
      _activeService = svc;
      _formData = {};
      _bvnModSubType = null;
    });
  }

  Future<void> _uploadId() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
      if (image == null) return;
      setState(() => _uploading = true);
      final res = await ApiService.uploadIdDocument(image.path);
      if (mounted) {
        setState(() => _uploading = false);
        if (res['success'] == true) {
          _updateField('idFileUrl', res['filePath']);
          AppToast.show(context, message: 'Document uploaded', type: ToastType.success);
        } else {
          AppToast.show(context, message: res['error'] ?? 'Upload failed', type: ToastType.error);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _uploading = false);
        AppToast.show(context, message: 'Failed to pick file', type: ToastType.error);
      }
    }
  }

  Future<void> _submitRequest(String serviceType, String? subType) async {
    if (!await ConnectivityService.ensureOnline(context)) return;
    if (!mounted) return;
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
            : (result['message'] ?? 'Request submitted');
        AppToast.show(context, message: msg, type: ToastType.success);
        setState(() {
          _formData = {};
          _bvnModSubType = null;
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
              child: RefreshIndicator(
                triggerMode: RefreshIndicatorTriggerMode.anywhere,
                edgeOffset: 76,
                onRefresh: () async {
                  await _fetchHistory();
                },
                color: AppTheme.primaryColor,
                child: NestedScrollView(
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  headerSliverBuilder: (context, innerBoxIsScrolled) => [
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(24, 76, 24, 16),
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
                            tabs: const [
                              Tab(text: 'Services'),
                              Tab(text: 'History'),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                  body: _loadingSettings
                      ? const Center(child: CircularProgressIndicator())
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            _buildServicesTab(),
                            _buildHistoryTab(),
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
              title: 'BVN Services',
              onBackPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildServicesTab() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Service selector chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _serviceLabels.entries.map((e) {
              final selected = _activeService == e.key;
              return GestureDetector(
                onTap: () => _switchService(e.key),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    gradient: selected ? const LinearGradient(
                      colors: [Color(0xFF1E90FF), Color(0xFF004687)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ) : null,
                    color: selected ? null : context.subtleBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected ? Colors.transparent : context.borderColor,
                      width: 1,
                    ),
                  ),
                  child: Text(
                    e.value,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                      color: selected ? Colors.white : Colors.black54,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 24),

          if (!_isServiceActive(_activeService))
            _buildInactiveMessage()
          else
            _buildActiveServiceForm(),
        ],
      ),
    );
  }

  Widget _buildActiveServiceForm() {
    switch (_activeService) {
      case 'BVN_MODIFICATION': return _buildBvnModForm();
      case 'BVN_RETRIEVAL': return _buildBvnRetrievalForm();
      case 'VNIN_NIBSS': return _buildVninNibssForm();
      case 'BVN_ANDROID': return _buildBvnAndroidForm();
      default: return const SizedBox.shrink();
    }
  }

  // ── BVN Modification ──
  Widget _buildBvnModForm() {
    final price = _currentPrice('BVN_MODIFICATION', _bvnModSubType ?? '');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_bvnModSubType != null) _buildPriceCard(price),
        if (_bvnModSubType != null) const SizedBox(height: 20),

        _buildSectionLabel('Modification Type'),
        const SizedBox(height: 8),
        _buildBottomSheetSelector(
          value: _bvnModSubType,
          placeholder: 'Select modification type',
          options: _bvnModOptions,
          onSelect: (v) => setState(() {
            _bvnModSubType = v;
            _formData = {'subType': v};
          }),
        ),

        if (_bvnModSubType != null) ...[
          const SizedBox(height: 20),
          // BVN input
          _buildSectionLabel('BVN Number'),
          const SizedBox(height: 8),
          _buildTextInput(key: 'bvn', hint: 'Enter 11-digit BVN', maxLength: 11, keyboardType: TextInputType.number),

          const SizedBox(height: 20),
          // ID type
          _buildSectionLabel('Method of Identification'),
          const SizedBox(height: 8),
          _buildBottomSheetSelector(
            value: _formData['idType'] as String?,
            placeholder: 'Select ID type',
            options: _idTypeOptions,
            onSelect: (v) => _updateField('idType', v),
          ),

          if (_formData['idType'] != null) ...[
            const SizedBox(height: 16),
            if (_formData['idType'] == 'nin') ...[
              _buildSectionLabel('Confirm NIN'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'nin', hint: 'Enter 11-digit NIN', maxLength: 11, keyboardType: TextInputType.number),
            ] else ...[
              _buildUploadArea(),
            ],
          ],

          const SizedBox(height: 20),
          ..._buildModificationFields(),

          const SizedBox(height: 24),
          GradientButton(
            text: 'Submit Request',
            icon: Icons.send_rounded,
            onPressed: _submitting ? () {} : () => _submitRequest('BVN_MODIFICATION', _bvnModSubType),
            loading: _submitting,
          ),
        ],
        const SizedBox(height: 40),
      ],
    );
  }

  List<Widget> _buildModificationFields() {
    final sub = _bvnModSubType ?? '';
    final showName = ['change_name', 'arrange_name', 'name_dob', 'name_phone', 'name_dob_phone'].contains(sub);
    final showDob = ['change_dob', 'name_dob', 'dob_phone', 'name_dob_phone'].contains(sub);
    final showPhone = ['change_phone', 'dob_phone', 'name_phone', 'name_dob_phone'].contains(sub);

    List<Widget> widgets = [];

    if (showName) {
      widgets.addAll([
        _buildSectionLabel('Old Name Details'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'old_firstname', hint: 'Old First Name'),
        const SizedBox(height: 12),
        _buildTextInput(key: 'old_middlename', hint: 'Old Middle Name (Optional)'),
        const SizedBox(height: 12),
        _buildTextInput(key: 'old_lastname', hint: 'Old Last Name'),
        const SizedBox(height: 20),
        _buildSectionLabel('New Name Details'),
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
        const SizedBox(height: 20),
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
        const SizedBox(height: 20),
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

  Widget _buildUploadArea() {
    final uploaded = _formData['idFileUrl'] != null;
    return GestureDetector(
      onTap: _uploading ? null : _uploadId,
      child: Container(
        height: 100,
        decoration: BoxDecoration(
          color: uploaded ? Colors.green.shade50 : context.subtleBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: uploaded ? Colors.green : Colors.grey.shade300,
            style: BorderStyle.solid,
          ),
        ),
        child: Center(
          child: _uploading
              ? const CircularProgressIndicator(strokeWidth: 2)
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      uploaded ? Icons.check_circle : Icons.cloud_upload_rounded,
                      color: uploaded ? Colors.green : Colors.grey.shade400,
                      size: 32,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      uploaded ? 'Document Uploaded' : 'Tap to upload ID document',
                      style: TextStyle(
                        fontSize: 13,
                        color: uploaded ? Colors.green.shade700 : Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  // ── BVN Retrieval ──
  Widget _buildBvnRetrievalForm() {
    final price = _currentPrice('BVN_RETRIEVAL', '');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildPriceCard(price),
        const SizedBox(height: 20),
        _buildSectionLabel('Phone Number'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'phoneNumber', hint: 'Enter registered phone number', maxLength: 15, keyboardType: TextInputType.phone),
        const SizedBox(height: 16),
        _buildSectionLabel('First Name'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'firstname', hint: 'Enter first name'),
        const SizedBox(height: 16),
        _buildSectionLabel('Last Name'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'lastname', hint: 'Enter last name'),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.blue.shade200)),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.info_outline_rounded, color: Colors.blue.shade700, size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'We will attempt to retrieve your BVN using the provided phone number. If automatic retrieval is unavailable, an admin will process the request manually.',
                  style: TextStyle(fontSize: 12, color: Colors.blue.shade800, height: 1.4),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        GradientButton(
          text: 'Submit Request',
          icon: Icons.search_rounded,
          onPressed: _submitting ? () {} : () => _submitRequest('BVN_RETRIEVAL', null),
          loading: _submitting,
        ),
        const SizedBox(height: 40),
      ],
    );
  }

  // ── VNIN → NIBSS ──
  Widget _buildVninNibssForm() {
    final price = _currentPrice('VNIN_NIBSS', '');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildPriceCard(price),
        const SizedBox(height: 20),
        _buildSectionLabel('Ticket ID'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'ticketId', hint: 'Enter ticket ID'),
        const SizedBox(height: 16),
        _buildSectionLabel('NIN'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'nin', hint: 'Enter 11-digit NIN', maxLength: 11, keyboardType: TextInputType.number),
        const SizedBox(height: 16),
        _buildSectionLabel('BVN'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'bvn', hint: 'Enter 11-digit BVN', maxLength: 11, keyboardType: TextInputType.number),
        const SizedBox(height: 16),
        _buildSectionLabel('Full Name'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'fullName', hint: 'Enter full name'),
        const SizedBox(height: 24),
        GradientButton(
          text: 'Submit Request',
          icon: Icons.send_rounded,
          onPressed: _submitting ? () {} : () => _submitRequest('VNIN_NIBSS', null),
          loading: _submitting,
        ),
        const SizedBox(height: 40),
      ],
    );
  }

  // ── BVN Android License ──
  Widget _buildBvnAndroidForm() {
    final price = _currentPrice('BVN_ANDROID', '');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildPriceCard(price),
        const SizedBox(height: 20),
        _buildSectionLabel('BVN'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'bvn', hint: '11-digit BVN', maxLength: 11, keyboardType: TextInputType.number),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('First Name'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'firstname', hint: 'First name'),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('Last Name'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'lastname', hint: 'Last name'),
            ])),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('Kegow Account No.'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'kegowAccount', hint: 'Kegow acct no.'),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('Account Name'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'accountName', hint: 'Account name'),
            ])),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('Agent Location'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'agentLocation', hint: 'Location'),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('State'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'state', hint: 'State'),
            ])),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('LGA'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'lga', hint: 'LGA'),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('Geo Zone'),
              const SizedBox(height: 8),
              _buildBottomSheetSelector(
                value: _formData['geoZone'] as String?,
                placeholder: 'Select zone',
                options: _geoZones.map((z) => {'value': z, 'label': z}).toList(),
                onSelect: (v) => _updateField('geoZone', v),
              ),
            ])),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('Address'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'address', hint: 'Street address'),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('House No.'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'houseNumber', hint: 'House no.'),
            ])),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('Phone'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'phoneNumber', hint: '080...', keyboardType: TextInputType.phone),
            ])),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _buildSectionLabel('Email'),
              const SizedBox(height: 8),
              _buildTextInput(key: 'email', hint: 'Email', keyboardType: TextInputType.emailAddress),
            ])),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionLabel('Date of Birth'),
        const SizedBox(height: 8),
        _buildTextInput(key: 'dateOfBirth', hint: 'DD-MM-YYYY', maxLength: 10),
        const SizedBox(height: 24),
        GradientButton(
          text: 'Submit Request',
          icon: Icons.send_rounded,
          onPressed: _submitting ? () {} : () => _submitRequest('BVN_ANDROID', null),
          loading: _submitting,
        ),
        const SizedBox(height: 40),
      ],
    );
  }

  // ── History Tab ──
  Widget _buildHistoryTab() {
    if (_loadingHistory) return const Center(child: CircularProgressIndicator());

    final bvnHistory = _history.where((r) =>
      ['BVN_MODIFICATION', 'BVN_RETRIEVAL', 'VNIN_NIBSS', 'BVN_ANDROID'].contains(r['serviceType'])
    ).toList();

    if (bvnHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No Requests Yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
            const SizedBox(height: 8),
            Text('Your BVN service requests will appear here.', style: TextStyle(color: context.textMuted)),
          ],
        ),
      );
    }

    return ListView.separated(
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.all(24),
      itemCount: bvnHistory.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _buildHistoryCard(bvnHistory[index]),
    );
  }

  Widget _buildHistoryCard(dynamic req) {
    final status = req['status'] ?? 0;
    final si = _getStatusInfo(status);
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
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(req['transRef'] ?? '', style: TextStyle(fontSize: 11, color: context.iconMuted)),
                    const SizedBox(height: 2),
                    Text(_allServiceDisplay[req['serviceType']] ?? req['serviceType'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    if (req['subType'] != null) Text((req['subType'] as String).replaceAll('_', ' '), style: TextStyle(fontSize: 12, color: context.textSecondary)),
                  ]),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  if (req['amount'] != null) Text('₦${_formatPrice((req['amount'] as num).toDouble())}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(color: si['color'].withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                    child: Text(si['label'], style: TextStyle(color: si['color'], fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ]),
              ],
            ),
            const SizedBox(height: 8),
            Text(req['createdAt'] != null ? DateTime.parse(req['createdAt']).toLocal().toString().substring(0, 16) : '', style: TextStyle(fontSize: 11, color: context.iconMuted)),
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
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 20),
              const Text('Request Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _detailRow('Service', _allServiceDisplay[req['serviceType']] ?? req['serviceType']),
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
                  decoration: BoxDecoration(color: context.subtleBg, borderRadius: BorderRadius.circular(12), border: Border.all(color: context.borderColor)),
                  child: Column(
                    children: detailsMap.entries
                        .where((e) => e.key != 'idFileUrl' && e.key != 'subType')
                        .map((e) => _detailRow(e.key.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m[0]}').replaceAll('_', ' ').trim(), e.value?.toString() ?? 'N/A'))
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

  Widget _buildInactiveMessage() {
    return Column(
      children: [
        const SizedBox(height: 40),
        Icon(Icons.construction_rounded, size: 64, color: context.iconMuted),
        const SizedBox(height: 16),
        Text('Service Unavailable', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.grey.shade700)),
        const SizedBox(height: 8),
        Text('This service is currently disabled.', style: TextStyle(color: context.textSecondary)),
      ],
    );
  }

  Widget _buildPriceCard(double price) {
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
          Text('₦${_formatPrice(price)}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
        ],
      ),
    );
  }

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
                  Flexible(
                    child: ListView(
                      shrinkWrap: true,
                      children: options.map((opt) {
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
                      }).toList(),
                    ),
                  ),
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
