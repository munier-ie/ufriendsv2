import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:lottie/lottie.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/custom_widgets.dart';
import '../../core/app_theme.dart';
import '../../core/constants.dart';
import '../../core/auth_service.dart';
import '../../core/http_client.dart' as http;
import '../../widgets/pin_display_widget.dart';
import 'slip_preview_screen.dart';
import 'home_screen.dart';

class TransactionStatusScreen extends StatefulWidget {
  final bool isSuccess;
  final String title;
  final String message;
  final String? amount;
  final Map<String, String>? details;
  final String? pinContent;
  final Map<String, dynamic>? slipReport;
  final String? slipType;
  final String? slipVariant;
  final String? slipDownloadUrl;
  final VoidCallback? onDone;

  const TransactionStatusScreen({
    super.key,
    required this.isSuccess,
    required this.title,
    required this.message,
    this.amount,
    this.details,
    this.pinContent,
    this.slipReport,
    this.slipType,
    this.slipVariant,
    this.slipDownloadUrl,
    this.onDone,
  });

  @override
  State<TransactionStatusScreen> createState() =>
      _TransactionStatusScreenState();
}

class _TransactionStatusScreenState extends State<TransactionStatusScreen> {
  final GlobalKey _receiptKey = GlobalKey();
  bool _downloadingSlip = false;
  bool _sharingImage = false;

  void _showShareOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: context.cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: context.borderColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Text(
                'Share Receipt',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  fontFamily: AppTheme.fontFamily,
                  color: context.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Choose how you want to share this transaction receipt',
                style: TextStyle(
                  fontSize: 13,
                  fontFamily: AppTheme.fontFamily,
                  color: context.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.image_rounded,
                    color: AppTheme.primaryColor,
                    size: 22,
                  ),
                ),
                title: const Text(
                  'Share Receipt Image',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                subtitle: const Text(
                  'Official styled PNG receipt with logo & details',
                  style: TextStyle(fontSize: 12),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _shareReceiptImage();
                },
              ),
              const SizedBox(height: 6),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryColor.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.text_snippet_rounded,
                    color: AppTheme.secondaryColor,
                    size: 22,
                  ),
                ),
                title: const Text(
                  'Share as Text',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                subtitle: const Text(
                  'Plain text summary for WhatsApp, SMS or chat',
                  style: TextStyle(fontSize: 12),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _shareReceiptText();
                },
              ),
              const SizedBox(height: 6),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.copy_rounded,
                    color: Colors.green,
                    size: 22,
                  ),
                ),
                title: const Text(
                  'Copy Details',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                subtitle: const Text(
                  'Copy all receipt details to clipboard',
                  style: TextStyle(fontSize: 12),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _copyReceiptDetails();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _shareReceiptImage() async {
    if (_sharingImage) return;
    setState(() => _sharingImage = true);

    try {
      // Wait until the branded receipt has completed its layout before capture.
      await WidgetsBinding.instance.endOfFrame;
      final boundary =
          _receiptKey.currentContext?.findRenderObject()
              as RenderRepaintBoundary?;
      if (boundary == null) {
        throw Exception('Receipt view not ready for capture');
      }

      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      image.dispose();
      if (byteData == null) {
        throw Exception('Could not encode image');
      }

      final pngBytes = byteData.buffer.asUint8List();
      final tempDir = await getTemporaryDirectory();
      final ref =
          widget.details?['Reference'] ??
          widget.details?['Ref'] ??
          widget.details?['transactionRef'] ??
          'tx_${DateTime.now().millisecondsSinceEpoch}';
      final cleanRef = ref.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_');
      final file = await File('${tempDir.path}/receipt_$cleanRef.png').create();
      await file.writeAsBytes(pngBytes);

      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text: 'Transaction Receipt - Ufriends IT\nhttps://ufriends.com.ng',
        ),
      );
    } catch (e) {
      if (mounted) {
        AppToast.error(context, 'Failed to share receipt image: $e');
      }
    } finally {
      if (mounted) setState(() => _sharingImage = false);
    }
  }

  void _shareReceiptText() {
    final buffer = _buildReceiptText();
    SharePlus.instance.share(
      ShareParams(text: buffer, subject: 'Transaction Receipt - Ufriends IT'),
    );
  }

  void _copyReceiptDetails() {
    final buffer = _buildReceiptText();
    Clipboard.setData(ClipboardData(text: buffer));
    AppToast.success(context, 'Receipt details copied to clipboard');
  }

  String _buildReceiptText() {
    final buffer = StringBuffer();
    buffer.writeln('=== UFRIENDS IT TRANSACTION RECEIPT ===');
    buffer.writeln('Status: ${widget.isSuccess ? "SUCCESSFUL" : "FAILED"}');
    if (widget.amount != null && widget.amount!.isNotEmpty) {
      buffer.writeln('Amount: ${widget.amount}');
    }
    if (widget.details?['Service'] != null) {
      buffer.writeln('Service: ${widget.details!['Service']}');
    }
    buffer.writeln('Message: ${widget.message}');
    if (widget.details != null) {
      widget.details!.forEach((key, val) {
        if (key != 'Service') buffer.writeln('$key: $val');
      });
    }
    if (widget.pinContent != null && widget.pinContent!.isNotEmpty) {
      buffer.writeln('PIN / Token: ${widget.pinContent}');
    }
    buffer.writeln('======================================');
    buffer.writeln('Thank you for choosing Ufriends IT!');
    buffer.writeln('https://ufriends.com.ng');
    return buffer.toString();
  }

  Future<void> _handleSlipAction() async {
    if (widget.slipReport != null && widget.slipReport!.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => SlipPreviewScreen(
            report: widget.slipReport!,
            slipType: widget.slipType ?? 'nin',
            selectedSlipVariant: widget.slipVariant ?? 'regular',
          ),
        ),
      );
      return;
    }

    final pdfUrl = widget.slipDownloadUrl ?? widget.slipReport?['pdfUrl'];
    if (pdfUrl == null || pdfUrl.toString().isEmpty) {
      AppToast.error(context, 'Slip document is not available yet.');
      return;
    }

    setState(() => _downloadingSlip = true);

    try {
      if (Platform.isAndroid) {
        await Permission.storage.request();
      }

      final token = await AuthService.getToken();
      final fullUrl = pdfUrl.toString().startsWith('http')
          ? pdfUrl.toString()
          : '${AppConstants.baseServerUrl}$pdfUrl';

      final response = await http.get(
        Uri.parse(fullUrl),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode != 200) {
        throw Exception('Download failed (${response.statusCode})');
      }

      Directory? downloadDir;
      if (Platform.isAndroid) {
        downloadDir = Directory('/storage/emulated/0/Download');
        if (!await downloadDir.exists()) {
          downloadDir = await getExternalStorageDirectory();
        }
      } else {
        downloadDir = await getApplicationDocumentsDirectory();
      }

      final fileName = 'Slip_${DateTime.now().millisecondsSinceEpoch}.pdf';
      final file = File('${downloadDir!.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);

      if (mounted) {
        setState(() => _downloadingSlip = false);
        AppToast.success(
          context,
          'Slip saved to Downloads/$fileName',
          title: 'Slip Downloaded',
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _downloadingSlip = false);
        AppToast.error(context, 'Failed to download slip: $e');
      }
    }
  }

  void _handleBack() {
    if (widget.onDone != null) {
      widget.onDone!();
      return;
    }
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSuccess = widget.isSuccess;
    final accentColor = isSuccess ? AppTheme.successColor : AppTheme.errorColor;

    // Remove duplicate title: If title is generic "Transaction Successful", use service name or don't repeat
    final lowerTitle = widget.title.trim().toLowerCase();
    final isGenericTitle =
        lowerTitle == 'transaction successful' ||
        lowerTitle == 'transaction failed' ||
        lowerTitle == 'successful' ||
        lowerTitle == 'failed';

    final serviceName = widget.details?['Service'];
    final displaySubtitle = isGenericTitle ? (serviceName ?? '') : widget.title;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _handleBack();
      },
      child: Scaffold(
        backgroundColor: context.cardColor,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_new_rounded,
              color: context.textPrimary,
              size: 20,
            ),
            onPressed: _handleBack,
          ),
          actions: [
            IconButton(
              icon: Icon(
                Icons.share_outlined,
                color: context.textPrimary,
                size: 22,
              ),
              onPressed: _showShareOptions,
              tooltip: 'Share Receipt',
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    children: [
                      // Lottie Animation (repeating loop)
                      Center(
                        child: Builder(
                          builder: (context) {
                            final lottie = Lottie.asset(
                              isSuccess
                                  ? 'assets/illustrations/success.json'
                                  : 'assets/illustrations/failed.json',
                              width: !isSuccess ? 150 : 140,
                              height: !isSuccess ? 150 : 140,
                              fit: BoxFit.contain,
                              repeat: true,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  width: 90,
                                  height: 90,
                                  decoration: BoxDecoration(
                                    color: accentColor.withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    isSuccess
                                        ? Icons.check_circle_rounded
                                        : Icons.cancel_rounded,
                                    color: accentColor,
                                    size: 54,
                                  ),
                                );
                              },
                            );

                            if (!isSuccess) {
                              return SizedBox(
                                width: 150,
                                height: 150,
                                child: Center(
                                  child: Transform.scale(
                                    scale: 1.55,
                                    child: lottie,
                                  ),
                                ),
                              );
                            }
                            return lottie;
                          },
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Status Badge (Sole status text — no duplicate "Transaction Successful" beneath it)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: accentColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: accentColor.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Text(
                          isSuccess
                              ? 'TRANSACTION SUCCESSFUL'
                              : 'TRANSACTION FAILED',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: accentColor,
                            fontFamily: AppTheme.fontFamily,
                          ),
                        ),
                      ),

                      // Display Subtitle/Service only if informative (avoid duplicate)
                      if (displaySubtitle.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            displaySubtitle,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.bold,
                              fontFamily: AppTheme.fontFamily,
                              color: context.textPrimary,
                            ),
                          ),
                        ),
                      ],

                      const SizedBox(height: 8),

                      // Message
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          widget.message,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.4,
                            fontFamily: AppTheme.fontFamily,
                            color: context.textSecondary,
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Branded RepaintBoundary Receipt Card (Used for high-resolution PNG receipt share)
                      RepaintBoundary(
                        key: _receiptKey,
                        child: Container(
                          margin: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 4,
                          ),
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: context.cardColor,
                            borderRadius: BorderRadius.circular(22),
                            border: Border.all(
                              color: context.borderColor,
                              width: 1.2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(
                                  alpha: context.isDark ? 0.35 : 0.05,
                                ),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Receipt Header
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const AppLogo(size: 28),
                                      const SizedBox(width: 8),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Ufriends IT',
                                            style: TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.primaryColor,
                                              fontFamily: AppTheme.fontFamily,
                                            ),
                                          ),
                                          Text(
                                            'Official Receipt',
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: context.textSecondary,
                                              fontFamily: AppTheme.fontFamily,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: accentColor.withValues(
                                        alpha: 0.12,
                                      ),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: accentColor.withValues(
                                          alpha: 0.3,
                                        ),
                                      ),
                                    ),
                                    child: Text(
                                      isSuccess ? 'SUCCESS' : 'FAILED',
                                      style: TextStyle(
                                        color: accentColor,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        fontFamily: AppTheme.fontFamily,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 14),
                              Divider(color: context.borderColor, height: 1),
                              const SizedBox(height: 14),

                              // Amount Highlight inside receipt
                              if (widget.amount != null &&
                                  widget.amount!.isNotEmpty) ...[
                                Text(
                                  'AMOUNT',
                                  style: TextStyle(
                                    fontSize: 10,
                                    letterSpacing: 1,
                                    fontWeight: FontWeight.w600,
                                    color: context.textSecondary,
                                    fontFamily: AppTheme.fontFamily,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.amount!,
                                  style: TextStyle(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: AppTheme.fontFamily,
                                    color: isSuccess
                                        ? AppTheme.primaryColor
                                        : AppTheme.errorColor,
                                  ),
                                ),
                                const SizedBox(height: 14),
                              ],

                              // Dedicated PIN & Serial Display if available
                              if (widget.pinContent != null &&
                                  widget.pinContent!.trim().isNotEmpty) ...[
                                PinDisplayWidget(
                                  pinContent: widget.pinContent!,
                                ),
                                const SizedBox(height: 14),
                              ],

                              // Details Table
                              if (widget.details != null &&
                                  widget.details!.isNotEmpty)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 10,
                                  ),
                                  decoration: BoxDecoration(
                                    color: context.subtleBg,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: context.borderColor,
                                    ),
                                  ),
                                  child: Column(
                                    children: widget.details!.entries.map((
                                      entry,
                                    ) {
                                      final isCopyable =
                                          entry.key.toLowerCase().contains(
                                            'reference',
                                          ) ||
                                          entry.key.toLowerCase().contains(
                                            'token',
                                          ) ||
                                          entry.key.toLowerCase().contains(
                                            'meter',
                                          ) ||
                                          entry.key.toLowerCase().contains(
                                            'card',
                                          );

                                      return Padding(
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 5,
                                        ),
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              entry.key,
                                              style: TextStyle(
                                                color: context.textSecondary,
                                                fontSize: 12,
                                                fontFamily: AppTheme.fontFamily,
                                              ),
                                            ),
                                            const SizedBox(width: 14),
                                            Expanded(
                                              child: InkWell(
                                                onTap: isCopyable
                                                    ? () {
                                                        Clipboard.setData(
                                                          ClipboardData(
                                                            text: entry.value,
                                                          ),
                                                        );
                                                        AppToast.success(
                                                          context,
                                                          '${entry.key} copied to clipboard',
                                                        );
                                                      }
                                                    : null,
                                                child: Row(
                                                  mainAxisAlignment:
                                                      MainAxisAlignment.end,
                                                  children: [
                                                    Flexible(
                                                      child: Text(
                                                        entry.value,
                                                        textAlign:
                                                            TextAlign.end,
                                                        style: TextStyle(
                                                          fontWeight:
                                                              FontWeight.bold,
                                                          fontSize: 12,
                                                          fontFamily: AppTheme
                                                              .fontFamily,
                                                          color: context
                                                              .textPrimary,
                                                        ),
                                                      ),
                                                    ),
                                                    if (isCopyable) ...[
                                                      const SizedBox(width: 4),
                                                      Icon(
                                                        Icons.copy_rounded,
                                                        size: 12,
                                                        color: AppTheme
                                                            .secondaryColor,
                                                      ),
                                                    ],
                                                  ],
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),

                              const SizedBox(height: 14),
                              Divider(color: context.borderColor, height: 1),
                              const SizedBox(height: 10),

                              // Receipt Footer
                              Column(
                                children: [
                                  Text(
                                    'Thank you for using Ufriends IT.',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                      color: context.textSecondary,
                                      fontFamily: AppTheme.fontFamily,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'ufriends.com.ng  •  info@ufriends.com.ng',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      color: context.textSecondary,
                                      fontFamily: AppTheme.fontFamily,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '+234 702 641 7709  •  Support available online',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      fontSize: 9,
                                      color: context.textSecondary,
                                      fontFamily: AppTheme.fontFamily,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Slip Download / Preview Button if applicable
                      if (widget.slipReport != null ||
                          widget.slipDownloadUrl != null)
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 8,
                          ),
                          child: OutlinedButton.icon(
                            onPressed: _downloadingSlip
                                ? null
                                : _handleSlipAction,
                            icon: _downloadingSlip
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(
                                    Icons.description_rounded,
                                    size: 20,
                                  ),
                            label: Text(
                              _downloadingSlip
                                  ? 'Downloading Slip...'
                                  : 'View / Download Official Slip',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.secondaryColor,
                              side: const BorderSide(
                                color: AppTheme.secondaryColor,
                                width: 1.5,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              minimumSize: const Size(double.infinity, 50),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),

              // Bottom Action Buttons
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 14,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _showShareOptions,
                        icon: _sharingImage
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.share_outlined, size: 18),
                        label: Text(
                          _sharingImage ? 'Preparing...' : 'Share Receipt',
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: context.textPrimary,
                          side: BorderSide(color: context.borderColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GradientButton(
                        text: 'Done',
                        onPressed: _handleBack,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
