import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

class CacRegistrationScreen extends StatefulWidget {
  const CacRegistrationScreen({super.key});

  @override
  State<CacRegistrationScreen> createState() => _CacRegistrationScreenState();
}

class _CacRegistrationScreenState extends State<CacRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  
  String _businessType = 'biz';
  final _bizNameCtrl = TextEditingController();
  final _altBizNameCtrl = TextEditingController();
  final _companyAddressCtrl = TextEditingController();
  final _resAddressCtrl = TextEditingController();
  final _natureCtrl = TextEditingController();
  final _shareCapitalCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  File? _directorId;
  File? _passport;

  bool _loadingPricing = true;
  bool _submitting = false;
  Map<String, dynamic>? _pricing;
  
  List<dynamic> _history = [];
  bool _loadingHistory = false;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _fetchPricing();
    _fetchHistory();
  }

  @override
  void dispose() {
    _bizNameCtrl.dispose();
    _altBizNameCtrl.dispose();
    _companyAddressCtrl.dispose();
    _resAddressCtrl.dispose();
    _natureCtrl.dispose();
    _shareCapitalCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchPricing() async {
    final res = await ApiService.fetchCacPricing();
    if (mounted) {
      if (res['success'] == true) {
        setState(() {
          _pricing = res['data'];
          _loadingPricing = false;
        });
      } else {
        setState(() => _loadingPricing = false);
      }
    }
  }

  Future<void> _fetchHistory() async {
    setState(() => _loadingHistory = true);
    final res = await ApiService.fetchCacHistory();
    if (mounted) {
      if (res['success'] == true) {
        setState(() {
          _history = res['data'] ?? [];
          _loadingHistory = false;
        });
      } else {
        setState(() => _loadingHistory = false);
      }
    }
  }

  double _getCurrentPrice() {
    if (_pricing == null) return 0.0;
    // We assume charge1/charge2 logic like web. In production, API should probably calculate based on user tier, but we use base charges here or what api returned.
    if (_businessType == 'limited') {
      return ((_pricing!['charge2'] ?? 15000) as num).toDouble();
    }
    return ((_pricing!['charge1'] ?? 5000) as num).toDouble();
  }

  Future<void> _pickImage(bool isDirector) async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
      if (image != null) {
        setState(() {
          if (isDirector) {
            _directorId = File(image.path);
          } else {
            _passport = File(image.path);
          }
        });
      }
    } catch (e) {
      if (mounted) AppToast.show(context, message: 'Failed to pick image', type: ToastType.error);
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_directorId == null) {
      AppToast.show(context, message: 'Please upload Director ID card', type: ToastType.error);
      return;
    }
    if (_passport == null) {
      AppToast.show(context, message: 'Please upload Passport photograph', type: ToastType.error);
      return;
    }

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          title: 'CAC Registration PIN',
          onVerify: (pin) async {
            final fields = {
              'businessType': _businessType,
              'businessName': _bizNameCtrl.text.trim(),
              'altBusinessName': _altBizNameCtrl.text.trim(),
              'companyAddress': _companyAddressCtrl.text.trim(),
              'residentialAddress': _resAddressCtrl.text.trim(),
              'natureOfBusiness': _natureCtrl.text.trim(),
              'shareCapital': _shareCapitalCtrl.text.trim(),
              'email': _emailCtrl.text.trim(),
              'phone': _phoneCtrl.text.trim(),
            };

            return await ApiService.submitCacRegistration(
              fields: fields,
              pin: pin,
              directorIdCardPath: _directorId!.path,
              passportPhotoPath: _passport!.path,
            );
          },
        ),
      ),
    );

    if (result != null && mounted) {
      setState(() => _submitting = false);

      if (result['success'] == true) {
        AppToast.show(context, message: result['message'] ?? 'Submitted successfully', type: ToastType.success);
        _formKey.currentState!.reset();
        setState(() {
          _directorId = null;
          _passport = null;
        });
        _fetchHistory();
      } else {
        AppToast.show(context, message: result['error'] ?? 'Registration failed', type: ToastType.error);
      }
    }
  }

  String _formatPrice(double price) {
    return price.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},');
  }

  Widget _buildTextField({
    required String label,
    required String hint,
    required TextEditingController controller,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: context.textPrimary)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
          decoration: InputDecoration(
            hintText: hint,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
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
                    const SizedBox(height: 16),
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
                    indicatorSize: TabBarIndicatorSize.tab,
                    indicator: BoxDecoration(
                      color: AppTheme.secondaryColor,
                      borderRadius: BorderRadius.circular(23),
                    ),
                    labelColor: Colors.white,
                    unselectedLabelColor: Colors.black54,
                    labelStyle: const TextStyle(fontWeight: FontWeight.bold),
                    tabs: const [
                      Tab(text: 'Register'),
                      Tab(text: 'History'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: TabBarView(
                  children: [
                    _buildRegisterTab(),
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
                title: 'CAC Registration',
                onBackPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _buildRegisterTab() {
    if (_loadingPricing) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_pricing != null && _pricing!['active'] == false) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.construction_rounded, size: 64, color: context.iconMuted),
            const SizedBox(height: 16),
            Text('Service Unavailable', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.grey.shade700)),
            const SizedBox(height: 8),
            Text('CAC Registration is currently disabled.', style: TextStyle(color: context.textSecondary)),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDropdown(),
            const SizedBox(height: 16),
            _buildTextField(
              label: 'Proposed Business Name',
              hint: 'Enter your first choice name',
              controller: _bizNameCtrl,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            _buildTextField(
              label: 'Alternative Business Name',
              hint: 'Enter a backup name',
              controller: _altBizNameCtrl,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            _buildTextField(
              label: 'Company Address',
              hint: 'Full company address',
              controller: _companyAddressCtrl,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            _buildTextField(
              label: 'Residential Address',
              hint: 'Director\'s residential address',
              controller: _resAddressCtrl,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildTextField(
                    label: 'Nature of Business',
                    hint: 'e.g. Trading',
                    controller: _natureCtrl,
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildTextField(
                    label: 'Share Capital (Opt)',
                    hint: 'e.g. 1M',
                    controller: _shareCapitalCtrl,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildTextField(
                    label: 'Email Address',
                    hint: 'Email',
                    keyboardType: TextInputType.emailAddress,
                    controller: _emailCtrl,
                    validator: (v) => v!.isEmpty || !v.contains('@') ? 'Invalid email' : null,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildTextField(
                    label: 'Phone Number',
                    hint: '080...',
                    keyboardType: TextInputType.phone,
                    controller: _phoneCtrl,
                    validator: (v) => v!.isEmpty || v.length < 10 ? 'Invalid phone' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text('Required Documents', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _buildFilePicker('Director ID Card', _directorId, true)),
                const SizedBox(width: 16),
                Expanded(child: _buildFilePicker('Passport Photo', _passport, false)),
              ],
            ),
            const SizedBox(height: 32),
            GradientButton(
              text: 'Pay NGN ${_formatPrice(_getCurrentPrice())}',
              onPressed: _submitting ? () {} : () => _submitForm(),
              loading: _submitting,
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline_rounded, color: Colors.amber.shade800, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'CAC registration takes 5-14 working days. You will be contacted via email/phone if more information is required.',
                      style: TextStyle(color: Colors.amber.shade900, fontSize: 13, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Certificate Type', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: context.textPrimary)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: _businessType,
          style: TextStyle(color: context.textPrimary, fontSize: 14, fontWeight: FontWeight.normal),
          decoration: const InputDecoration(
            hintText: 'Select Certificate Type',
          ),
          items: const [
            DropdownMenuItem(value: 'biz', child: Text('Business Name Registration', style: TextStyle(fontWeight: FontWeight.normal))),
            DropdownMenuItem(value: 'limited', child: Text('Limited Liability Company (LTD)', style: TextStyle(fontWeight: FontWeight.normal))),
            DropdownMenuItem(value: 'enterprise', child: Text('Enterprise (Business Name)', style: TextStyle(fontWeight: FontWeight.normal))),
            DropdownMenuItem(value: 'ngo', child: Text('NGO / Incorporated Trustees', style: TextStyle(fontWeight: FontWeight.normal))),
          ],
          onChanged: (v) {
            if (v != null) setState(() => _businessType = v);
          },
        ),
      ],
    );
  }

  Widget _buildFilePicker(String label, File? file, bool isDirector) {
    return GestureDetector(
      onTap: () => _pickImage(isDirector),
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          color: file != null ? Colors.blue.shade50 : context.subtleBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: file != null ? AppTheme.primaryColor : Colors.grey.shade300, style: BorderStyle.solid),
        ),
        child: file != null
            ? Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(15),
                    child: Image.file(file, fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: CircleAvatar(
                      radius: 12,
                      backgroundColor: Colors.black54,
                      child: Icon(Icons.check, size: 16, color: Colors.white),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(isDirector ? Icons.badge_rounded : Icons.camera_alt_rounded, color: context.iconMuted, size: 32),
                  const SizedBox(height: 8),
                  Text(label, style: TextStyle(fontSize: 12, color: context.textSecondary, fontWeight: FontWeight.w500)),
                  Text('Tap to select', style: TextStyle(fontSize: 10, color: context.iconMuted)),
                ],
              ),
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_loadingHistory) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_history.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No CAC Registrations', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
            const SizedBox(height: 8),
            Text('Your past submissions will appear here.', style: TextStyle(color: context.textMuted)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      triggerMode: RefreshIndicatorTriggerMode.anywhere,
      onRefresh: _fetchHistory,
      child: ListView.separated(
        padding: const EdgeInsets.all(24),
        itemCount: _history.length,
        separatorBuilder: (_, _) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          final item = _history[index];
          final status = item['status'] ?? 0;
          
          Color statusColor;
          String statusText;
          if (status == 1) {
            statusColor = Colors.green;
            statusText = 'Approved';
          } else if (status == 2) {
            statusColor = Colors.red;
            statusText = 'Rejected';
          } else {
            statusColor = Colors.orange;
            statusText = 'Pending';
          }

          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: context.borderColor),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item['businessName'] ?? 'Unknown Business',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text('Alt: ${item['altBusinessName'] ?? '-'}', style: TextStyle(color: context.textSecondary, fontSize: 13)),
                const SizedBox(height: 4),
                Text('Type: ${(item['businessType'] ?? '').toUpperCase()}', style: TextStyle(color: context.textSecondary, fontSize: 13)),
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      item['createdAt'] != null ? DateTime.parse(item['createdAt']).toLocal().toString().substring(0, 10) : '',
                      style: TextStyle(color: context.textMuted, fontSize: 12),
                    ),
                    if (status == 2 && item['adminNotes'] != null)
                      Flexible(
                        child: Text(
                          'Note: ${item['adminNotes']}',
                          style: TextStyle(color: Colors.red.shade700, fontSize: 12, fontStyle: FontStyle.italic),
                          textAlign: TextAlign.right,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
