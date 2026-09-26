import 'dart:convert';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';

import '../../main.dart' show showLocalNotification;
import '../../core/custom_widgets.dart';
import '../../core/auth_service.dart';
import '../../core/constants.dart';
import '../../core/app_theme.dart';
import '../../core/api_service.dart';

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
  late Map<String, dynamic> _report;
  bool _fetchingReport = false;

  @override
  void initState() {
    super.initState();
    _report = Map<String, dynamic>.from(widget.report);
    final ref = _report['transactionRef'] ?? _report['reference'];
    if ((_report['firstName'] == null || _report['firstName'].toString().isEmpty) && ref != null) {
      _fetchReportDetails(ref.toString());
    }
  }

  Future<void> _fetchReportDetails(String ref) async {
    setState(() => _fetchingReport = true);
    for (int i = 0; i < 20; i++) {
      await Future.delayed(const Duration(milliseconds: 2000));
      if (!mounted) return;
      final res = await ApiService.getProfessionalRequestStatus(ref);
      if (res['status'] == 'completed' && res['report'] is Map<String, dynamic>) {
        if (!mounted) return;
        setState(() {
          _report.addAll(Map<String, dynamic>.from(res['report']));
          _fetchingReport = false;
        });
        return;
      } else if (res['status'] == 'failed') {
        if (!mounted) return;
        setState(() => _fetchingReport = false);
        AppToast.error(
          context,
          res['error'] ?? 'Could not retrieve verification details.',
          title: 'Verification Error',
        );
        break;
      }
    }
    if (mounted) setState(() => _fetchingReport = false);
  }

  String get _fullName {
    final first = _report['firstName'] ?? '';
    final last = _report['lastName'] ?? _report['surname'] ?? '';
    final mid = _report['middleName'] ?? _report['middle_name'] ?? '';
    final name = '$first $mid $last'.replaceAll(RegExp(r'\s+'), ' ').trim();
    return name.isNotEmpty ? name : (_fetchingReport ? 'Loading details...' : 'Identity Holder');
  }

  String get _slipLabel {
    switch (widget.selectedSlipVariant.toLowerCase()) {
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

  String get _pageTitle => widget.slipType.toLowerCase() == 'bvn' ? 'BVN' : 'NIN';

  Widget _buildPhoto(Map<String, dynamic> r) {
    String? b64 = r['base64Photo'] ?? r['base64Image'] ?? r['photo'];
    if (b64 != null && b64.isNotEmpty) {
      try {
        final cleanB64 = b64.contains(',') ? b64.split(',').last : b64;
        return Image.memory(
          base64Decode(cleanB64.replaceAll(RegExp(r'\s+'), '')),
          fit: BoxFit.cover,
          width: double.infinity,
          height: double.infinity,
          errorBuilder: (c, e, s) => Center(
            child: Icon(Icons.person_rounded, size: 48, color: context.iconMuted),
          ),
        );
      } catch (_) {}
    }

    if (r['photoUrl'] != null && r['photoUrl'].toString().isNotEmpty) {
      return Image.network(
        r['photoUrl'],
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (c, e, s) => Center(
          child: Icon(Icons.person_rounded, size: 48, color: context.iconMuted),
        ),
      );
    }

    if (_fetchingReport) {
      return const Center(
        child: SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    return Center(
      child: Icon(Icons.person_rounded, size: 48, color: context.iconMuted),
    );
  }

  Future<void> _downloadSlip() async {
    var pdfUrl = _report['pdfUrl'];
    final ref = _report['transactionRef'] ?? _report['reference'];
    if ((pdfUrl == null || pdfUrl.toString().isEmpty) && ref != null) {
      final res = await ApiService.getProfessionalRequestStatus(ref.toString());
      if (res['status'] == 'completed' && res['report'] is Map<String, dynamic>) {
        setState(() {
          _report.addAll(Map<String, dynamic>.from(res['report']));
        });
        pdfUrl = _report['pdfUrl'];
      }
    }

    if (pdfUrl == null || pdfUrl.toString().isEmpty) {
      if (!mounted) return;
      AppToast.warning(
        context,
        'PDF document is still generating. Please try again in a few moments.',
        title: 'Processing Slip',
      );
      return;
    }

    PermissionStatus status;
    if (Platform.isAndroid) {
      final androidInfo = await _getAndroidVersion();
      if (androidInfo >= 33) {
        status = PermissionStatus.granted;
      } else {
        status = await Permission.storage.request();
      }
    } else {
      status = await Permission.storage.request();
    }

    if (status.isDenied) {
      if (!mounted) return;
      AppToast.warning(
        context,
        'Storage permission is required to save your slip. Please enable it in Settings.',
        title: 'Permission Required',
      );
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
        throw Exception('Download failed with status: ${response.statusCode}');
      }

      final slipTypeLabel = widget.slipType.toUpperCase();
      final variantLabel = widget.selectedSlipVariant.toUpperCase();
      final cleanRef = (ref ?? 'slip').toString().replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final fileName = '${slipTypeLabel}_${variantLabel}_$cleanRef.pdf';

      String filePath = '';
      bool savedToDownloadsFolder = false;

      // 1. Attempt writing to public Downloads folder on Android
      if (Platform.isAndroid) {
        final publicDownloadDir = Directory('/storage/emulated/0/Download');
        if (await publicDownloadDir.exists()) {
          try {
            final testFile = File('${publicDownloadDir.path}/$fileName');
            await testFile.writeAsBytes(response.bodyBytes, flush: true);
            filePath = testFile.path;
            savedToDownloadsFolder = true;
          } catch (_) {
            // OS restricted direct file write
          }
        }
      }

      // 2. Fallback to app-accessible external storage or documents directory
      if (filePath.isEmpty) {
        Directory? targetDir;
        if (Platform.isAndroid) {
          try {
            targetDir = await getExternalStorageDirectory();
          } catch (_) {}
        }
        targetDir ??= await getApplicationDocumentsDirectory();
        final file = File('${targetDir.path}/$fileName');
        await file.writeAsBytes(response.bodyBytes, flush: true);
        filePath = file.path;
      }

      setState(() {
        _downloadedPath = filePath;
        _downloading = false;
      });

      // Trigger local push notification for slip download
      try {
        final notifId = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        await showLocalNotification(
          id: notifId,
          title: 'Slip Downloaded Successfully',
          body: savedToDownloadsFolder
              ? 'Your $_pageTitle slip ($fileName) has been saved to your Downloads folder.'
              : 'Your $_pageTitle slip ($fileName) has been downloaded.',
          payload: filePath,
        );
      } catch (notifErr) {
        debugPrint('Download notification error: $notifErr');
      }

      if (!mounted) return;
      AppToast.success(
        context,
        savedToDownloadsFolder
            ? 'Slip saved to Downloads: $fileName'
            : 'Slip downloaded successfully: $fileName',
        title: 'Download Complete',
      );
    } catch (e) {
      setState(() => _downloading = false);
      if (!mounted) return;
      AppToast.error(
        context,
        'Could not complete download: ${e.toString()}',
        title: 'Download Failed',
      );
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

  void _shareSlipPdf() {
    if (_downloadedPath != null && File(_downloadedPath!).existsSync()) {
      SharePlus.instance.share(
        ShareParams(
          files: [XFile(_downloadedPath!)],
          text: '$_pageTitle Slip PDF - $_fullName (Ufriends IT)',
        ),
      );
    }
  }

  void _shareSlipDetails() {
    final isBvn = widget.slipType.toLowerCase() == 'bvn';
    final primaryNumber = isBvn
        ? (_report['bvnNumber'] ?? _report['bvn'] ?? '')
        : (_report['nin'] ?? _report['ninNumber'] ?? '');
    final primaryLabel = isBvn ? 'BVN' : 'NIN';

    final buffer = StringBuffer();
    buffer.writeln('=== UFRIENDS IT VERIFIED SLIP ===');
    buffer.writeln('Type: $_pageTitle Slip ($_slipLabel)');
    buffer.writeln('Name: $_fullName');
    buffer.writeln('$primaryLabel: $primaryNumber');
    buffer.writeln('Date of Birth: ${_report['dateOfBirth'] ?? _report['date_of_birth'] ?? 'N/A'}');
    buffer.writeln('Phone: ${_report['phoneNumber'] ?? _report['phone_number'] ?? _report['telephone'] ?? 'N/A'}');
    buffer.writeln('Status: VERIFIED');
    buffer.writeln('Reference: ${_report['transactionRef'] ?? _report['reference'] ?? 'N/A'}');
    buffer.writeln('Verified via Ufriends IT (https://ufriends.com.ng)');

    SharePlus.instance.share(
      ShareParams(
        text: buffer.toString(),
        subject: '$_pageTitle Slip Details - $_fullName',
      ),
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
            // Scrollable Content
            Positioned.fill(
              child: RefreshIndicator(
                edgeOffset: 76,
                color: AppTheme.primaryColor,
                onRefresh: () async {
                  final ref = _report['transactionRef'] ?? _report['reference'];
                  if (ref != null) {
                    await _fetchReportDetails(ref.toString());
                  }
                },
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(20.0, 76.0, 20.0, 116.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Live Polling Notice if fetching
                      if (_fetchingReport)
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
                          ),
                          child: Row(
                            children: [
                              const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2.2),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Fetching Live $_pageTitle Details...',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primaryColor,
                                        fontFamily: AppTheme.fontFamily,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Connecting to official identity database. Details will appear automatically.',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: context.textSecondary,
                                        fontFamily: AppTheme.fontFamily,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Credential Slip Card
                      _buildSlipCard(),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom Sticky Download Bar
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
                    decoration: BoxDecoration(
                      color: context.glassBg,
                      border: Border(top: BorderSide(color: context.borderColor)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: context.isDark ? 0.35 : 0.06),
                          blurRadius: 16,
                          offset: const Offset(0, -4),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_downloadedPath != null)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
                              children: [
                                const Icon(Icons.check_circle_rounded, color: AppTheme.successColor, size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Saved: ${_downloadedPath!.split('/').last}',
                                    style: const TextStyle(
                                      color: AppTheme.successColor,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      fontFamily: AppTheme.fontFamily,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: _shareSlipPdf,
                                  icon: const Icon(Icons.share_rounded, size: 16, color: Color(0xFF1E90FF)),
                                  label: const Text(
                                    'Share PDF',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E90FF)),
                                  ),
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        GradientButton(
                          text: _downloading
                              ? 'Downloading Slip...'
                              : (_downloadedPath != null ? 'Download Again' : 'Download Slip PDF'),
                          icon: Icons.download_rounded,
                          loading: _downloading,
                          onPressed: _downloading ? () {} : _downloadSlip,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Top Floating Header
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: FloatingScreenHeader(
                title: '$_pageTitle Slip — $_slipLabel',
                onBackPressed: () => Navigator.pop(context),
                actions: [
                  if (_fetchingReport)
                    const Padding(
                      padding: EdgeInsets.only(right: 16),
                      child: SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  else
                    IconButton(
                      icon: const Icon(Icons.share_rounded, color: Color(0xFF1E90FF), size: 20),
                      onPressed: _shareSlipDetails,
                      tooltip: 'Share Details',
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }



  Widget _buildSlipCard() {
    final r = _report;
    final isBvn = widget.slipType.toLowerCase() == 'bvn';
    final primaryNumber = isBvn
        ? (r['bvnNumber'] ?? r['bvn'] ?? '').toString()
        : (r['nin'] ?? r['ninNumber'] ?? '').toString();
    final primaryLabel = isBvn ? 'BVN Number' : 'NIN Number';

    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: context.borderColor, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: context.isDark ? 0.4 : 0.06),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Strip with app primary gradient
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(22),
                topRight: Radius.circular(22),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                  ),
                  child: const Icon(Icons.verified_rounded, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'FEDERAL REPUBLIC OF NIGERIA',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.8,
                          fontFamily: AppTheme.fontFamily,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Verified $_pageTitle Slip',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          fontFamily: AppTheme.fontFamily,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    _slipLabel.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.6,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Photo & Primary ID Section
          Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Photo container
                Container(
                  width: 86,
                  height: 98,
                  decoration: BoxDecoration(
                    color: context.subtleBg,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: context.borderColor, width: 1.5),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _buildPhoto(r),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _fullName,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: context.textPrimary,
                          fontFamily: AppTheme.fontFamily,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      // Copyable Number Pill
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: primaryNumber.isNotEmpty && primaryNumber != 'N/A'
                              ? () {
                                  Clipboard.setData(ClipboardData(text: primaryNumber));
                                  AppToast.success(context, '$primaryLabel copied to clipboard');
                                }
                              : null,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      primaryLabel.toUpperCase(),
                                      style: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.secondaryColor,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      primaryNumber.isNotEmpty ? primaryNumber : 'N/A',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: AppTheme.primaryColor,
                                        letterSpacing: 1.2,
                                        fontFamily: AppTheme.fontFamily,
                                      ),
                                    ),
                                  ],
                                ),
                                if (primaryNumber.isNotEmpty && primaryNumber != 'N/A') ...[
                                  const SizedBox(width: 8),
                                  const Icon(
                                    Icons.copy_rounded,
                                    size: 14,
                                    color: AppTheme.secondaryColor,
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          Divider(height: 1, color: context.dividerColor),

          // Fields Table
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            child: Column(
              children: <Widget?>[
                _buildRow('Date of Birth', r['dateOfBirth'] ?? r['date_of_birth'] ?? r['birthdate'] ?? r['dob']),
                _buildRow('Gender', r['gender']),
                _buildRow('Phone Number', r['phoneNumber'] ?? r['phone_number'] ?? r['telephoneno'] ?? r['telephone'] ?? r['phone'] ?? r['mobile'] ?? r['phoneNumber1']),
                if (isBvn) ...[
                  _buildRow('NIN', r['nin'] ?? r['ninNumber'] ?? r['number_nin']),
                  _buildRow('Marital Status', r['maritalStatus'] ?? r['marital_status']),
                  _buildRow('Enrolment Bank', r['enrollmentBank'] ?? r['enrollment_bank']),
                  _buildRow('Enrolment Branch', r['enrollmentBranch'] ?? r['enrollment_branch']),
                ] else ...[
                  _buildRow('Middle Name', r['middleName'] ?? r['middle_name'] ?? r['middlename']),
                  _buildRow('Nationality', r['nationality']),
                  _buildRow('Tracking ID', r['trackingId'] ?? r['tracking_id']),
                ],
                _buildRow('State of Origin', r['stateOfOrigin'] ?? r['state_of_origin'] ?? r['origin_state'] ?? r['originState']),
                _buildRow('LGA of Origin', r['lgaOfOrigin'] ?? r['lga_of_origin'] ?? r['origin_lga'] ?? r['originLga']),
                _buildRow('State of Residence', r['stateOfResidence'] ?? r['state_of_residence'] ?? r['residenceState'] ?? r['residence_state']),
                _buildRow('LGA of Residence', r['lgaOfResidence'] ?? r['lga_of_residence'] ?? r['residenceLga'] ?? r['residence_lga']),
                _buildRow('Address', r['residentialAddress'] ?? r['residenceAddress'] ?? r['residence_address'] ?? r['address']),
              ].whereType<Widget>().toList(),
            ),
          ),

          // Card Footer
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: context.subtleBg,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(22),
                bottomRight: Radius.circular(22),
              ),
              border: Border(top: BorderSide(color: context.borderColor)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Transaction Ref',
                          style: TextStyle(
                            fontSize: 10,
                            color: context.textMuted,
                            fontFamily: AppTheme.fontFamily,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          (_report['transactionRef'] ?? _report['reference'] ?? '—').toString(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: context.textPrimary,
                            fontFamily: AppTheme.fontFamily,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'Slip Format',
                          style: TextStyle(
                            fontSize: 10,
                            color: context.textMuted,
                            fontFamily: AppTheme.fontFamily,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _slipLabel,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.secondaryColor,
                            fontFamily: AppTheme.fontFamily,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.shield_outlined, size: 12, color: context.textMuted),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        'Official verification document issued under lawful authority.',
                        style: TextStyle(
                          fontSize: 10,
                          color: context.textMuted,
                          fontFamily: AppTheme.fontFamily,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget? _buildRow(String label, dynamic rawValue) {
    if (rawValue == null) return null;
    final str = rawValue.toString().trim();
    if (str.isEmpty ||
        str == '—' ||
        str == '-' ||
        str.toLowerCase() == 'n/a' ||
        str.toLowerCase() == 'null' ||
        str.toLowerCase() == 'none') {
      return null;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 135,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: context.textSecondary,
                fontWeight: FontWeight.w500,
                fontFamily: AppTheme.fontFamily,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              str,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: context.textPrimary,
                fontFamily: AppTheme.fontFamily,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
