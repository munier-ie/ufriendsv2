import 'dart:convert';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/custom_widgets.dart';
import '../../core/auth_service.dart';
import '../../core/constants.dart';

class SlipPreviewScreen extends StatefulWidget {
  final Map<String, dynamic> report;
  final String slipType; // 'bvn' or 'nin'
  final String selectedSlipVariant; // 'regular', 'plastic', 'standard', 'premium', 'vnin'

  const SlipPreviewScreen({
    super.key,
    required this.report,
    required this.slipType,
    required this.selectedSlipVariant,
  });

  @override
  State<SlipPreviewScreen> createState() => _SlipPreviewScreenState();
}

class _SlipPreviewScreenState extends State<SlipPreviewScreen> {
  bool _downloading = false;
  String? _downloadedPath;

  String get _fullName {
    final first = widget.report['firstName'] ?? '';
    final last = widget.report['lastName'] ?? widget.report['surname'] ?? '';
    return '$first $last'.trim();
  }

  Widget _buildPhoto(Map<String, dynamic> r) {
    String? b64 = r['base64Photo'] ?? r['base64Image'] ?? r['photo'];
    if (b64 != null && b64.isNotEmpty) {
      try {
        final cleanB64 = b64.contains(',') ? b64.split(',').last : b64;
        return ClipRRect(
          borderRadius: BorderRadius.circular(11),
          child: Image.memory(
            base64Decode(cleanB64.replaceAll(RegExp(r'\s+'), '')),
            fit: BoxFit.cover,
            errorBuilder: (c, e, s) => const Icon(Icons.person_rounded, size: 50, color: Colors.grey),
          ),
        );
      } catch (e) {
        // Fallback
      }
    }
    
    if (r['photoUrl'] != null && r['photoUrl'].toString().isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(11),
        child: Image.network(
          r['photoUrl'],
          fit: BoxFit.cover,
          errorBuilder: (c, e, s) => const Icon(Icons.person_rounded, size: 50, color: Colors.grey),
        ),
      );
    }
    
    return const Icon(Icons.person_rounded, size: 50, color: Colors.grey);
  }

  String get _slipLabel {
    switch (widget.selectedSlipVariant) {
      case 'plastic':
        return 'Premium Plastic';
      case 'standard':
        return 'Standard';
      case 'premium':
        return 'Premium';
      case 'vnin':
        return 'VNIN';
      default:
        return 'Regular';
    }
  }

  String get _pageTitle => widget.slipType == 'bvn' ? 'BVN Slip' : 'NIN Slip';

  Future<void> _downloadSlip() async {
    final pdfUrl = widget.report['pdfUrl'];
    if (pdfUrl == null || pdfUrl.toString().isEmpty) {
      AppToast.show(context, message: 'PDF not available yet. Try again later.', type: ToastType.error);
      return;
    }

    // Request storage permission
    PermissionStatus status;
    if (Platform.isAndroid) {
      final androidInfo = await _getAndroidVersion();
      if (androidInfo >= 33) {
        // Android 13+ doesn't need WRITE_EXTERNAL_STORAGE
        status = PermissionStatus.granted;
      } else {
        status = await Permission.storage.request();
      }
    } else {
      status = await Permission.storage.request();
    }

    if (status.isDenied) {
      if (!mounted) return;
      AppToast.show(context, message: 'Storage permission denied. Please allow in settings.', type: ToastType.warning);
      return;
    }

    setState(() => _downloading = true);

    try {
      final token = await AuthService.getToken();
      final fullUrl = pdfUrl.toString().startsWith('http')
          ? pdfUrl.toString()
          : '${AppConstants.baseServerUrl}$pdfUrl';

      final response = await http.get(
        Uri.parse(fullUrl),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to download file: ${response.statusCode}');
      }

      // Get the Downloads directory
      Directory? downloadDir;
      if (Platform.isAndroid) {
        downloadDir = Directory('/storage/emulated/0/Download');
        if (!await downloadDir.exists()) {
          downloadDir = await getExternalStorageDirectory();
        }
      } else {
        downloadDir = await getApplicationDocumentsDirectory();
      }

      final slipTypeLabel = widget.slipType.toUpperCase();
      final variantLabel = widget.selectedSlipVariant;
      final ref = (widget.report['transactionRef'] ?? 'slip').toString().replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final fileName = '${slipTypeLabel}_${variantLabel}_$ref.pdf';
      final filePath = '${downloadDir!.path}/$fileName';

      final file = File(filePath);
      await file.writeAsBytes(response.bodyBytes);

      setState(() {
        _downloadedPath = filePath;
        _downloading = false;
      });

      if (!mounted) return;
      AppToast.show(
        context,
        message: 'Slip saved to Downloads/$fileName',
        type: ToastType.success,
      );
    } catch (e) {
      setState(() => _downloading = false);
      if (!mounted) return;
      AppToast.show(context, message: 'Download failed: ${e.toString()}', type: ToastType.error);
    }
  }

  Future<int> _getAndroidVersion() async {
    try {
      final result = await Process.run('getprop', ['ro.build.version.sdk']);
      return int.tryParse(result.stdout.toString().trim()) ?? 30;
    } catch (_) {
      return 30;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: Stack(
        children: [
          // Header background
          Container(
            height: 220,
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
                // Top bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                      Expanded(
                        child: Text(
                          '$_pageTitle — $_slipLabel Slip',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Verified banner
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.green.shade400,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.verified_rounded, color: Colors.white, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Identity Verified ✓',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            Text(
                              _fullName.isNotEmpty ? _fullName : 'Details confirmed',
                              style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Slip card
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
                    child: _buildSlipCard(),
                  ),
                ),
              ],
            ),
          ),

          // Download button — sticky at bottom
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: ClipRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.9),
                    border: Border(top: BorderSide(color: Colors.grey.shade200)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_downloadedPath != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle_rounded, color: Colors.green.shade600, size: 18),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  'Saved: ${_downloadedPath!.split('/').last}',
                                  style: TextStyle(color: Colors.green.shade700, fontSize: 12, fontWeight: FontWeight.w600),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      GradientButton(
                        text: _downloading ? 'Downloading...' : 'Download Slip PDF',
                        icon: Icons.download_rounded,
                        onPressed: _downloading ? () {} : _downloadSlip,
                        loading: _downloading,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSlipCard() {
    final r = widget.report;

    // Determine fields to show based on slip type
    final isBvn = widget.slipType == 'bvn';
    final primaryNumber = isBvn
        ? (r['bvnNumber'] ?? r['bvn'] ?? '')
        : (r['nin'] ?? r['ninNumber'] ?? '');
    final primaryLabel = isBvn ? 'BVN Number' : 'NIN Number';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header strip
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF004687), Color(0xFF1E90FF)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(24),
                topRight: Radius.circular(24),
              ),
            ),
            child: Row(
              children: [
                // Coat of arms placeholder
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.account_balance_rounded, color: Colors.white, size: 26),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Federal Republic of Nigeria',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                      ),
                      Text(
                        'Verified Identity Slip',
                        style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.shade400,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified_rounded, color: Colors.white, size: 12),
                      SizedBox(width: 4),
                      Text('VERIFIED', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Photo + Primary number row
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                // Photo
                Container(
                  width: 90,
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: _buildPhoto(r),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _fullName.isNotEmpty ? _fullName : '—',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                      ),
                      const SizedBox(height: 8),
                      _pillLabel(primaryLabel),
                      const SizedBox(height: 4),
                      Text(
                        primaryNumber.toString().isNotEmpty
                            ? primaryNumber.toString()
                            : 'N/A',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF004687),
                          letterSpacing: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Fields grid
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                _buildRow('Date of Birth', r['dateOfBirth'] ?? r['date_of_birth'] ?? '—'),
                _buildRow('Gender', r['gender'] ?? '—'),
                _buildRow('Phone Number', r['phoneNumber'] ?? r['phone_number'] ?? r['phoneNumber1'] ?? '—'),
                if (isBvn) ...[
                  _buildRow('NIN', r['nin'] ?? '—'),
                  _buildRow('Marital Status', r['maritalStatus'] ?? r['marital_status'] ?? '—'),
                  _buildRow('Enrolment Bank', r['enrollmentBank'] ?? r['enrollment_bank'] ?? '—'),
                  _buildRow('Enrolment Branch', r['enrollmentBranch'] ?? r['enrollment_branch'] ?? '—'),
                ] else ...[
                  _buildRow('Middle Name', r['middleName'] ?? r['middle_name'] ?? '—'),
                  _buildRow('Nationality', r['nationality'] ?? 'Nigerian'),
                  _buildRow('Tracking ID', r['trackingId'] ?? r['tracking_id'] ?? '—'),
                ],
                _buildRow('State of Origin', r['stateOfOrigin'] ?? r['state_of_origin'] ?? '—'),
                _buildRow('LGA of Origin', r['lgaOfOrigin'] ?? r['lga_of_origin'] ?? '—'),
                _buildRow('State of Residence', r['stateOfResidence'] ?? r['state_of_residence'] ?? r['residenceState'] ?? '—'),
                _buildRow('LGA of Residence', r['lgaOfResidence'] ?? r['lga_of_residence'] ?? r['residenceLga'] ?? '—'),
                _buildRow('Address', r['residentialAddress'] ?? r['residenceAddress'] ?? r['address'] ?? '—', fullWidth: true),
              ],
            ),
          ),

          // Footer
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(24),
                bottomRight: Radius.circular(24),
              ),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Transaction Ref', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        Text(
                          (widget.report['transactionRef'] ?? '—').toString(),
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black87),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Slip Type', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        Text(
                          _slipLabel,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E90FF)),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'This slip is for verification purposes only and remains valid for the lifetime of the holder.',
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade500, height: 1.4),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pillLabel(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF004687).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(text, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF004687))),
    );
  }

  Widget _buildRow(String label, String value, {bool fullWidth = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: fullWidth ? null : 140,
            child: Text(
              label,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
            ),
          ),
          if (!fullWidth) const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }
}
