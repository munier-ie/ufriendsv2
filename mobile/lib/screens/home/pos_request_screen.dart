import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

class PosRequestScreen extends StatefulWidget {
  const PosRequestScreen({super.key});

  @override
  State<PosRequestScreen> createState() => _PosRequestScreenState();
}

class _PosRequestScreenState extends State<PosRequestScreen> {
  final ImagePicker _picker = ImagePicker();
  Map<String, dynamic> _formData = {};
  bool _uploading = false;
  bool _submitting = false;
  Map<String, dynamic>? _settings;
  bool _loadingSettings = true;

  final List<String> _businessCategories = ['Retail', 'Food & Beverage', 'Services', 'Health & Beauty', 'Other'];
  final List<Map<String, dynamic>> _posTypes = [
    {'id': 'android', 'label': 'Android POS', 'img': 'assets/nin/pos1.jpg'},
    {'id': 'traditional', 'label': 'Traditional POS', 'img': 'assets/nin/pos2.jpg'},
    {'id': 'mini', 'label': 'Mini POS', 'img': 'assets/nin/pos3.jpg'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchSettings();
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

  double _currentPrice() {
    if (_settings == null || _settings!['prices'] == null) return 0;
    final prices = _settings!['prices'] as List<dynamic>;
    final match = prices.firstWhere(
      (p) => p['serviceType'] == 'POS_REQUEST' && p['subType'] == (_formData['subType'] ?? ''),
      orElse: () => null,
    );
    return match != null ? (match['price'] as num).toDouble() : 0;
  }

  void _updateField(String key, dynamic value) {
    setState(() => _formData[key] = value);
  }

  Future<void> _uploadDocument(String key) async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
      if (image == null) return;
      setState(() => _uploading = true);
      final res = await ApiService.uploadIdDocument(image.path);
      if (res['success'] == true) {
        _updateField(key, res['data']['filePath']);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Document uploaded successfully', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green));
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['error'] ?? 'Upload failed')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('An error occurred during upload')));
      }
    } finally {
      setState(() => _uploading = false);
    }
  }

  void _submit() {
    // Form validation
    if (_formData['provider'] == null) return _showError('Please select a provider');
    if (_formData['subType'] == null) return _showError('Please select a payment option');
    if (_formData['posType'] == null) return _showError('Please select a POS type');

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          onPinEntered: (pin) async {
            setState(() => _submitting = true);
            final res = await ApiService.submitManualService(
              serviceType: 'POS_REQUEST',
              subType: _formData['subType'],
              details: _formData,
              pin: pin,
            );
            setState(() => _submitting = false);
            if (!mounted) return;
            if (res['success'] == true) {
              Navigator.pop(context); // close screen
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('POS Request submitted successfully', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green),
              );
            } else {
              _showError(res['error'] ?? 'Failed to submit request');
            }
          },
        ),
      ),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    final bool isMoniepoint = _formData['provider'] == 'moniepoint';
    final bool hasAccount = _formData['hasAccount'] == 'yes';
    final String? tier = _formData['tier'];
    final bool noAccountFlow = !isMoniepoint || (isMoniepoint && _formData['hasAccount'] == 'no');

    return Scaffold(
      backgroundColor: context.scaffoldBackground,
      appBar: const PremiumAppBar(title: 'POS Request'),
      body: _loadingSettings
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeaderCard(),
                  const SizedBox(height: 20),
                  _buildDropdown('POS Provider', 'provider', [
                    {'value': 'moniepoint', 'label': 'Moniepoint'},
                    {'value': 'opay', 'label': 'Opay'},
                    {'value': 'other', 'label': 'Other'},
                  ]),
                  if (isMoniepoint) ...[
                    const SizedBox(height: 16),
                    _buildDropdown('Do you have a Moniepoint account?', 'hasAccount', [
                      {'value': 'yes', 'label': 'Yes'},
                      {'value': 'no', 'label': 'No'},
                    ]),
                  ],
                  if (isMoniepoint && hasAccount) ...[
                    const SizedBox(height: 16),
                    _buildDropdown('Which Tier is your account?', 'tier', [
                      {'value': '1', 'label': 'Tier 1'},
                      {'value': '2', 'label': 'Tier 2'},
                      {'value': '3', 'label': 'Tier 3'},
                    ]),
                  ],
                  if (noAccountFlow || (isMoniepoint && hasAccount && ['1', '2', '3'].contains(tier))) ...[
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: context.cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: context.dividerColor),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (noAccountFlow || ['1', '2', '3'].contains(tier))
                            PremiumTextField(
                              label: 'BVN or NIN used for account',
                              hintText: 'Enter 11-digit BVN/NIN',
                              keyboardType: TextInputType.number,
                              onChanged: (v) => _updateField('bvnNin', v),
                            ),
                          if (noAccountFlow || tier == '1') ...[
                            const SizedBox(height: 12),
                            PremiumTextField(
                              label: 'Phone Number',
                              hintText: '080...',
                              keyboardType: TextInputType.phone,
                              onChanged: (v) => _updateField('phone', v),
                            ),
                            const SizedBox(height: 12),
                            PremiumTextField(
                              label: 'Email Address',
                              hintText: 'example@mail.com',
                              keyboardType: TextInputType.emailAddress,
                              onChanged: (v) => _updateField('email', v),
                            ),
                            const SizedBox(height: 16),
                            const Text('Next of Kin Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 12),
                            PremiumTextField(label: 'Name', hintText: 'Next of Kin Name', onChanged: (v) => _updateField('nokName', v)),
                            const SizedBox(height: 12),
                            PremiumTextField(label: 'Phone', hintText: 'Next of Kin Phone', keyboardType: TextInputType.phone, onChanged: (v) => _updateField('nokPhone', v)),
                            const SizedBox(height: 12),
                            PremiumTextField(label: 'Email', hintText: 'Next of Kin Email', keyboardType: TextInputType.emailAddress, onChanged: (v) => _updateField('nokEmail', v)),
                            const SizedBox(height: 12),
                            PremiumTextField(label: 'Address', hintText: 'Next of Kin Address', onChanged: (v) => _updateField('nokAddress', v)),
                          ],
                          if (noAccountFlow || ['1', '2'].contains(tier)) ...[
                            const SizedBox(height: 16),
                            PremiumTextField(label: 'Residential Address', hintText: 'Your Address', onChanged: (v) => _updateField('address', v)),
                            const SizedBox(height: 12),
                            _buildUploadButton('proofOfAddressUrl', 'Upload Proof of Address'),
                          ],
                          if (noAccountFlow) ...[
                            const SizedBox(height: 16),
                            PremiumTextField(label: 'Business Address', hintText: 'Your Business Address', onChanged: (v) => _updateField('businessAddress', v)),
                            const SizedBox(height: 12),
                            _buildCategoryDropdown(),
                            const SizedBox(height: 12),
                            _buildUploadButton('userPictureUrl', 'Upload Your Picture'),
                          ],
                        ],
                      ),
                    ),
                  ],
                  if (_formData['provider'] != null) ...[
                    const SizedBox(height: 20),
                    const Text('Select POS Type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 12),
                    _buildPosTypeSelector(),
                    const SizedBox(height: 20),
                    _buildDropdown('Payment Option', 'subType', [
                      {'value': 'PAY_MONEY', 'label': 'Pay POS Fee'},
                      {'value': 'FEE_WAIVER', 'label': 'Fee Waiver (0 NGN)'},
                    ]),
                    if (_formData['subType'] == 'FEE_WAIVER') ...[
                      const SizedBox(height: 16),
                      _buildUploadButton('proofOfBusinessUrl', 'Upload Proof of Business (Shop Photo/Cert)'),
                    ],
                  ],
                  const SizedBox(height: 32),
                  PremiumButton(
                    text: 'Submit POS Request',
                    onPressed: _submitting ? null : _submit,
                    isLoading: _submitting,
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildHeaderCard() {
    final price = _currentPrice();
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: context.cardGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.2),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Service Fee', style: TextStyle(color: Colors.white70, fontSize: 14)),
              const SizedBox(height: 4),
              Text('₦${price.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')}', 
                style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
            child: const Icon(Icons.point_of_sale_rounded, color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown(String label, String field, List<Map<String, String>> options) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.dividerColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: _formData[field],
              hint: const Text('Select Option'),
              dropdownColor: context.cardColor,
              items: options.map((o) => DropdownMenuItem<String>(value: o['value'], child: Text(o['label']!))).toList(),
              onChanged: (v) => _updateField(field, v),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Business Category', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.dividerColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: _formData['businessCategory'],
              hint: const Text('Select Category'),
              dropdownColor: context.cardColor,
              items: _businessCategories.map((c) => DropdownMenuItem<String>(value: c, child: Text(c))).toList(),
              onChanged: (v) => _updateField('businessCategory', v),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPosTypeSelector() {
    return Row(
      children: _posTypes.map((pos) {
        final isSelected = _formData['posType'] == pos['id'];
        return Expanded(
          child: GestureDetector(
            onTap: () => _updateField('posType', pos['id']),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isSelected ? AppTheme.primaryColor : context.dividerColor, width: isSelected ? 2 : 1),
                color: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.1) : context.cardColor,
              ),
              child: Column(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                    child: Image.asset(pos['img'], height: 80, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 80, color: Colors.grey.shade200, child: const Icon(Icons.point_of_sale))),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(pos['label'], style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isSelected ? AppTheme.primaryColor : context.textPrimary), textAlign: TextAlign.center),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildUploadButton(String key, String label) {
    final bool hasFile = _formData[key] != null;
    return GestureDetector(
      onTap: _uploading ? null : () => _uploadDocument(key),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: hasFile ? Colors.green.withValues(alpha: 0.1) : context.cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: hasFile ? Colors.green : context.dividerColor, style: BorderStyle.solid),
        ),
        child: Column(
          children: [
            if (_uploading)
              const CircularProgressIndicator()
            else if (hasFile) ...[
              const Icon(Icons.check_circle, color: Colors.green, size: 32),
              const SizedBox(height: 8),
              const Text('Document Uploaded', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            ] else ...[
              Icon(Icons.cloud_upload_outlined, color: context.iconMuted, size: 32),
              const SizedBox(height: 8),
              Text(label, style: TextStyle(color: context.textSecondary)),
            ],
          ],
        ),
      ),
    );
  }
}
