import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:lottie/lottie.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

import '../core/app_theme.dart';
import '../core/constants.dart';
import '../core/auth_service.dart';
import '../core/http_client.dart' as http;
import '../core/custom_widgets.dart';
import '../widgets/pin_display_widget.dart';
import '../screens/home/slip_preview_screen.dart';
import '../screens/home/wallet_screen.dart';

enum ModalType { success, error, warning, info }

class AppModal {
  /// Displays a modern, branded popup modal featuring Lottie animations.
  static Future<T?> show<T>(
    BuildContext context, {
    String? title,
    required String message,
    ModalType type = ModalType.info,
    String primaryButtonText = 'Okay',
    VoidCallback? onPrimaryPressed,
    String? secondaryButtonText,
    VoidCallback? onSecondaryPressed,
    bool autoClose = false,
    Duration autoCloseDuration = const Duration(milliseconds: 3500),
    Widget? customContent,
  }) {
    // Smart Contextual Normalization
    final lowerMsg = message.toLowerCase();
    String effectiveTitle = title ?? '';
    String effectiveMsg = message;
    String effectivePrimaryBtn = primaryButtonText;
    VoidCallback? effectiveOnPrimary = onPrimaryPressed;
    String? effectiveSecondaryBtn = secondaryButtonText;
    VoidCallback? effectiveOnSecondary = onSecondaryPressed;
    Widget? effectiveCustomContent = customContent;

    // 1. INSUFFICIENT WALLET / BALANCE
    if (lowerMsg.contains('insufficient') ||
        lowerMsg.contains('wallet balance') ||
        lowerMsg.contains('low balance') ||
        lowerMsg.contains('fund your wallet') ||
        lowerMsg.contains('insufficient funds')) {
      if (effectiveTitle.isEmpty ||
          effectiveTitle == 'Failed' ||
          effectiveTitle == 'Error') {
        effectiveTitle = 'Insufficient Balance';
      }
      if (lowerMsg == 'insufficient wallet balance' ||
          lowerMsg == 'insufficient balance' ||
          lowerMsg == 'insufficient funds') {
        effectiveMsg =
            'Your wallet balance is too low to complete this transaction. Please fund your wallet to continue.';
      } else if (!lowerMsg.contains('fund') && !lowerMsg.contains('top up')) {
        effectiveMsg =
            '${message.replaceAll(RegExp(r'\.\s*$'), '')}. Please fund your wallet to proceed.';
      }
      if (effectivePrimaryBtn == 'Close' || effectivePrimaryBtn == 'Okay') {
        effectivePrimaryBtn = 'Fund Wallet';
      }
      effectiveSecondaryBtn ??= 'Cancel';
      effectiveOnPrimary ??= () {
        Navigator.of(context, rootNavigator: true).push(
          MaterialPageRoute(builder: (_) => WalletScreen(onRefresh: () {})),
        );
      };
    }
    // 2. SESSION EXPIRED / UNAUTHORIZED
    else if (lowerMsg.contains('unauthorized') ||
        lowerMsg.contains('jwt expired') ||
        lowerMsg.contains('session expired') ||
        lowerMsg.contains('token expired') ||
        lowerMsg.contains('invalid token')) {
      if (effectiveTitle.isEmpty || effectiveTitle == 'Failed') {
        effectiveTitle = 'Session Expired';
      }
      effectiveMsg =
          'Your login session has expired for your security. Please log in again to continue.';
      effectivePrimaryBtn = 'Log In';
      effectiveSecondaryBtn ??= 'Dismiss';
    }
    // 3. NETWORK / CONNECTION ERROR
    else if (lowerMsg.contains('network error') ||
        lowerMsg.contains('failed to fetch') ||
        lowerMsg.contains('socketexception') ||
        lowerMsg.contains('check your internet') ||
        lowerMsg.contains('no internet')) {
      if (effectiveTitle.isEmpty || effectiveTitle == 'Failed') {
        effectiveTitle = 'Connection Problem';
      }
      effectiveMsg =
          'Unable to reach the server. Please check your internet connection and try again.';
      effectivePrimaryBtn = 'Retry';
      effectiveSecondaryBtn ??= 'Dismiss';
    }
    // 4. TRANSACTION PIN / SECURITY
    else if (lowerMsg.contains('incorrect pin') ||
        lowerMsg.contains('wrong pin') ||
        lowerMsg.contains('invalid pin') ||
        lowerMsg.contains('pin entered')) {
      if (effectiveTitle.isEmpty || effectiveTitle == 'Failed') {
        effectiveTitle = 'Incorrect Transaction PIN';
      }
      effectivePrimaryBtn = 'Try Again';
      effectiveSecondaryBtn ??= 'Cancel';
    }
    // 5. SERVICE / PROVIDER DOWNTIME
    else if (lowerMsg.contains('temporarily unavailable') ||
        lowerMsg.contains('provider down') ||
        lowerMsg.contains('undergoing maintenance') ||
        lowerMsg.contains('service down')) {
      if (effectiveTitle.isEmpty || effectiveTitle == 'Failed') {
        effectiveTitle = 'Service Temporarily Unavailable';
      }
      effectivePrimaryBtn = 'Understood';
    }
    // 6. VALIDATION & REQUIRED FIELDS
    else if (lowerMsg.contains('must be') ||
        lowerMsg.contains('please enter') ||
        lowerMsg.contains('please upload') ||
        lowerMsg.contains('required') ||
        lowerMsg.contains('invalid email') ||
        lowerMsg.contains('invalid phone') ||
        lowerMsg.contains('11 digits')) {
      if (effectiveTitle.isEmpty || effectiveTitle == 'Failed') {
        effectiveTitle = 'Information Required';
      }
      effectivePrimaryBtn = 'Check Details';
    }
    // 7. SUCCESS TYPES
    else if (type == ModalType.success &&
        (effectiveTitle.isEmpty || effectiveTitle == 'Success')) {
      if (lowerMsg.contains('copied')) {
        effectiveTitle = 'Copied to Clipboard';
      } else if (lowerMsg.contains('saved') || lowerMsg.contains('updated')) {
        effectiveTitle = 'Changes Saved';
      } else if (lowerMsg.contains('funded') || lowerMsg.contains('credit')) {
        effectiveTitle = 'Wallet Funded';
      } else {
        effectiveTitle = 'Success';
      }
    }
    // 8. ERROR FALLBACK
    else if (type == ModalType.error &&
        (effectiveTitle.isEmpty || effectiveTitle == 'Failed')) {
      effectiveTitle = 'Action Could Not Be Completed';
    }

    // Haptic feedback for tactile feel
    if (type == ModalType.error) {
      HapticFeedback.heavyImpact();
    } else {
      HapticFeedback.lightImpact();
    }

    return showGeneralDialog<T>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss Modal',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 280),
      pageBuilder: (dialogContext, anim1, anim2) {
        return _ModalDialogContent(
          title: effectiveTitle.isNotEmpty ? effectiveTitle : null,
          message: effectiveMsg,
          type: type,
          primaryButtonText: effectivePrimaryBtn,
          onPrimaryPressed: effectiveOnPrimary,
          secondaryButtonText: effectiveSecondaryBtn,
          onSecondaryPressed: effectiveOnSecondary,
          autoClose: autoClose,
          autoCloseDuration: autoCloseDuration,
          customContent: effectiveCustomContent,
        );
      },
      transitionBuilder: (dialogContext, anim1, anim2, child) {
        final curve = CurvedAnimation(parent: anim1, curve: Curves.easeOutBack);
        return ScaleTransition(
          scale: Tween<double>(begin: 0.85, end: 1.0).animate(curve),
          child: FadeTransition(opacity: anim1, child: child),
        );
      },
    );
  }

  /// Convenience helper for success modal
  static Future<T?> success<T>(
    BuildContext context, {
    String? title,
    required String message,
    String primaryButtonText = 'Done',
    VoidCallback? onPrimaryPressed,
    bool autoClose = false,
  }) {
    return show<T>(
      context,
      title: title ?? 'Success',
      message: message,
      type: ModalType.success,
      primaryButtonText: primaryButtonText,
      onPrimaryPressed: onPrimaryPressed,
      autoClose: autoClose,
    );
  }

  /// Convenience helper for error modal
  static Future<T?> error<T>(
    BuildContext context, {
    String? title,
    required String message,
    String primaryButtonText = 'Close',
    VoidCallback? onPrimaryPressed,
    bool autoClose = false,
  }) {
    return show<T>(
      context,
      title: title ?? 'Failed',
      message: message,
      type: ModalType.error,
      primaryButtonText: primaryButtonText,
      onPrimaryPressed: onPrimaryPressed,
      autoClose: autoClose,
    );
  }

  /// Convenience helper for warning modal
  static Future<T?> warning<T>(
    BuildContext context, {
    String? title,
    required String message,
    String primaryButtonText = 'Understood',
    VoidCallback? onPrimaryPressed,
    bool autoClose = false,
  }) {
    return show<T>(
      context,
      title: title ?? 'Notice',
      message: message,
      type: ModalType.warning,
      primaryButtonText: primaryButtonText,
      onPrimaryPressed: onPrimaryPressed,
      autoClose: autoClose,
    );
  }

  /// Convenience helper for info modal
  static Future<T?> info<T>(
    BuildContext context, {
    String? title,
    required String message,
    String primaryButtonText = 'Okay',
    VoidCallback? onPrimaryPressed,
    bool autoClose = false,
  }) {
    return show<T>(
      context,
      title: title ?? 'Information',
      message: message,
      type: ModalType.info,
      primaryButtonText: primaryButtonText,
      onPrimaryPressed: onPrimaryPressed,
      autoClose: autoClose,
    );
  }

  /// Rich Transactional Modal with Full Details, Slip Download & Receipt Printing
  static Future<T?> transaction<T>(
    BuildContext context, {
    required bool isSuccess,
    String? title,
    required String message,
    String? amount,
    Map<String, String>? details,
    String? pinContent,
    Map<String, dynamic>? slipReport,
    String? slipType, // 'nin' or 'bvn'
    String? slipVariant,
    String? slipDownloadUrl,
    VoidCallback? onDone,
  }) {
    if (isSuccess) {
      HapticFeedback.mediumImpact();
    } else {
      HapticFeedback.heavyImpact();
    }

    return showGeneralDialog<T>(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss Transaction Modal',
      barrierColor: Colors.black54,
      transitionDuration: const Duration(milliseconds: 320),
      pageBuilder: (dialogContext, anim1, anim2) {
        return _TransactionModalDialog(
          isSuccess: isSuccess,
          title:
              title ??
              (isSuccess ? 'Transaction Successful' : 'Transaction Failed'),
          message: message,
          amount: amount,
          details: details,
          pinContent: pinContent,
          slipReport: slipReport,
          slipType: slipType,
          slipVariant: slipVariant,
          slipDownloadUrl: slipDownloadUrl,
          onDone: onDone,
        );
      },
      transitionBuilder: (dialogContext, anim1, anim2, child) {
        final curve = CurvedAnimation(parent: anim1, curve: Curves.easeOutBack);
        return ScaleTransition(
          scale: Tween<double>(begin: 0.85, end: 1.0).animate(curve),
          child: FadeTransition(opacity: anim1, child: child),
        );
      },
    );
  }
}

class _ModalDialogContent extends StatefulWidget {
  final String? title;
  final String message;
  final ModalType type;
  final String primaryButtonText;
  final VoidCallback? onPrimaryPressed;
  final String? secondaryButtonText;
  final VoidCallback? onSecondaryPressed;
  final bool autoClose;
  final Duration autoCloseDuration;
  final Widget? customContent;

  const _ModalDialogContent({
    this.title,
    required this.message,
    required this.type,
    required this.primaryButtonText,
    this.onPrimaryPressed,
    this.secondaryButtonText,
    this.onSecondaryPressed,
    required this.autoClose,
    required this.autoCloseDuration,
    this.customContent,
  });

  @override
  State<_ModalDialogContent> createState() => _ModalDialogContentState();
}

class _ModalDialogContentState extends State<_ModalDialogContent> {
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    if (widget.autoClose) {
      _dismissTimer = Timer(widget.autoCloseDuration, () {
        if (mounted) {
          final nav = Navigator.of(context);
          if (nav.canPop()) {
            nav.pop();
          }
        }
      });
    }
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    super.dispose();
  }

  String get _defaultTitle {
    if (widget.title != null && widget.title!.isNotEmpty) {
      return widget.title!;
    }
    switch (widget.type) {
      case ModalType.success:
        return 'Operation Successful';
      case ModalType.error:
        return 'Action Could Not Be Completed';
      case ModalType.warning:
        return 'Attention Required';
      case ModalType.info:
        return 'Notice';
    }
  }

  Color _accentColor(BuildContext context) {
    switch (widget.type) {
      case ModalType.success:
        return AppTheme.successColor;
      case ModalType.error:
        return AppTheme.errorColor;
      case ModalType.warning:
        return AppTheme.warningColor;
      case ModalType.info:
        return AppTheme.secondaryColor;
    }
  }

  Widget _buildLottieIllustration() {
    String assetPath;
    IconData fallbackIcon;

    switch (widget.type) {
      case ModalType.success:
        assetPath = 'assets/illustrations/success.json';
        fallbackIcon = Icons.check_circle_rounded;
        break;
      case ModalType.error:
        assetPath = 'assets/illustrations/failed.json';
        fallbackIcon = Icons.cancel_rounded;
        break;
      case ModalType.warning:
        assetPath = 'assets/illustrations/warning.json';
        fallbackIcon = Icons.warning_rounded;
        break;
      case ModalType.info:
        assetPath = 'assets/illustrations/warning.json';
        fallbackIcon = Icons.info_rounded;
        break;
    }

    final isError = widget.type == ModalType.error;
    final lottie = Lottie.asset(
      assetPath,
      width: isError ? 150 : 140,
      height: isError ? 150 : 140,
      fit: BoxFit.contain,
      repeat: true,
      errorBuilder: (context, error, stackTrace) {
        final color = _accentColor(context);
        return Container(
          width: 95,
          height: 95,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            shape: BoxShape.circle,
            border: Border.all(color: color.withValues(alpha: 0.3), width: 2),
          ),
          child: Icon(fallbackIcon, size: 54, color: color),
        );
      },
    );

    if (isError) {
      return SizedBox(
        width: 150,
        height: 150,
        child: Center(child: Transform.scale(scale: 1.6, child: lottie)),
      );
    }

    return SizedBox(width: 140, height: 140, child: Center(child: lottie));
  }

  @override
  Widget build(BuildContext context) {
    final accent = _accentColor(context);

    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: MediaQuery.of(context).size.width * 0.88,
          constraints: const BoxConstraints(maxWidth: 400),
          margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: context.borderColor, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(
                  alpha: context.isDark ? 0.45 : 0.15,
                ),
                blurRadius: 28,
                offset: const Offset(0, 10),
              ),
              BoxShadow(
                color: accent.withValues(alpha: 0.08),
                blurRadius: 36,
                spreadRadius: 2,
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Close Icon
              Padding(
                padding: const EdgeInsets.only(top: 14, right: 14),
                child: Align(
                  alignment: Alignment.topRight,
                  child: InkWell(
                    onTap: () =>
                        Navigator.of(context, rootNavigator: true).pop(),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: context.subtleBg,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.close,
                        size: 18,
                        color: context.textSecondary,
                      ),
                    ),
                  ),
                ),
              ),

              // Illustration
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: _buildLottieIllustration(),
              ),

              const SizedBox(height: 12),

              // Title
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  _defaultTitle,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    fontFamily: AppTheme.fontFamily,
                    color: context.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
              ),

              const SizedBox(height: 8),

              // Message
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  widget.message,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.45,
                    fontFamily: AppTheme.fontFamily,
                    color: context.textSecondary,
                  ),
                ),
              ),

              if (widget.customContent != null) ...[
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: widget.customContent!,
                ),
              ],

              const SizedBox(height: 24),

              // Action Buttons
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    if (widget.secondaryButtonText != null) ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            Navigator.of(context, rootNavigator: true).pop();
                            widget.onSecondaryPressed?.call();
                          },
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: context.borderColor),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 13),
                          ),
                          child: Text(
                            widget.secondaryButtonText!,
                            style: TextStyle(
                              color: context.textSecondary,
                              fontFamily: AppTheme.fontFamily,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryColor.withValues(
                                alpha: 0.28,
                              ),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(context, rootNavigator: true).pop();
                            widget.onPrimaryPressed?.call();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 13),
                          ),
                          child: Text(
                            widget.primaryButtonText,
                            style: const TextStyle(
                              color: Colors.white,
                              fontFamily: AppTheme.fontFamily,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _TransactionModalDialog extends StatefulWidget {
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

  const _TransactionModalDialog({
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
  State<_TransactionModalDialog> createState() =>
      _TransactionModalDialogState();
}

class _TransactionModalDialogState extends State<_TransactionModalDialog> {
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
        AppModal.error(context, message: 'Failed to share receipt image: $e');
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
    AppModal.success(
      context,
      title: 'Copied',
      message: 'Receipt details copied to clipboard',
    );
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

  Future<void> _downloadOrViewSlip() async {
    // If slipReport is passed, preview via SlipPreviewScreen
    if (widget.slipReport != null && widget.slipReport!.isNotEmpty) {
      Navigator.of(context, rootNavigator: true).pop();
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

    // Direct PDF URL download if available
    final pdfUrl = widget.slipDownloadUrl ?? widget.slipReport?['pdfUrl'];
    if (pdfUrl == null || pdfUrl.toString().isEmpty) {
      AppModal.error(
        context,
        message: 'Slip document is not ready yet. Please check Activity later.',
      );
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
        AppModal.success(
          context,
          title: 'Slip Downloaded',
          message: 'Saved to Downloads/$fileName',
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _downloadingSlip = false);
        AppModal.error(context, message: 'Failed to download slip: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSuccess = widget.isSuccess;
    final accentColor = isSuccess ? AppTheme.successColor : AppTheme.errorColor;

    return Center(
      child: Material(
        color: Colors.transparent,
        child: Container(
          width: MediaQuery.of(context).size.width * 0.92,
          constraints: const BoxConstraints(maxWidth: 420, maxHeight: 680),
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: context.borderColor, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(
                  alpha: context.isDark ? 0.5 : 0.18,
                ),
                blurRadius: 32,
                offset: const Offset(0, 12),
              ),
              BoxShadow(
                color: accentColor.withValues(alpha: 0.1),
                blurRadius: 40,
                spreadRadius: 2,
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header with Close
              Padding(
                padding: const EdgeInsets.only(top: 14, right: 14, left: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: accentColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isSuccess
                                ? Icons.check_circle_rounded
                                : Icons.cancel_rounded,
                            size: 14,
                            color: accentColor,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            isSuccess ? 'SUCCESS' : 'FAILED',
                            style: TextStyle(
                              color: accentColor,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              fontFamily: AppTheme.fontFamily,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    InkWell(
                      onTap: () {
                        Navigator.of(context, rootNavigator: true).pop();
                        widget.onDone?.call();
                      },
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: context.subtleBg,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.close,
                          size: 18,
                          color: context.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Scrollable Details
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 22,
                    vertical: 8,
                  ),
                  child: Column(
                    children: [
                      // Lottie Animation
                      Builder(
                        builder: (context) {
                          final lottie = Lottie.asset(
                            isSuccess
                                ? 'assets/illustrations/success.json'
                                : 'assets/illustrations/failed.json',
                            width: !isSuccess ? 145 : 130,
                            height: !isSuccess ? 145 : 130,
                            fit: BoxFit.contain,
                            repeat: true,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  color: accentColor.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isSuccess
                                      ? Icons.check_circle_rounded
                                      : Icons.cancel_rounded,
                                  size: 48,
                                  color: accentColor,
                                ),
                              );
                            },
                          );

                          if (!isSuccess) {
                            return SizedBox(
                              width: 145,
                              height: 145,
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

                      const SizedBox(height: 10),

                      // Title (Remove duplicate "Transaction Successful")
                      Builder(
                        builder: (context) {
                          final lowerTitle = widget.title.trim().toLowerCase();
                          final isGeneric =
                              lowerTitle == 'transaction successful' ||
                              lowerTitle == 'transaction failed' ||
                              lowerTitle == 'successful' ||
                              lowerTitle == 'failed';
                          final service = widget.details?['Service'];
                          final displayTitle = isGeneric
                              ? (service ?? '')
                              : widget.title;

                          if (displayTitle.isEmpty) {
                            return const SizedBox.shrink();
                          }

                          return Column(
                            children: [
                              Text(
                                displayTitle,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.bold,
                                  fontFamily: AppTheme.fontFamily,
                                  color: context.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                            ],
                          );
                        },
                      ),

                      // Message
                      Text(
                        widget.message,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          fontFamily: AppTheme.fontFamily,
                          color: context.textSecondary,
                        ),
                      ),

                      // Branded RepaintBoundary Receipt View
                      RepaintBoundary(
                        key: _receiptKey,
                        child: Container(
                          margin: const EdgeInsets.only(top: 14),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: context.cardColor,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: context.borderColor,
                              width: 1.1,
                            ),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const AppLogo(size: 24),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Ufriends IT',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: AppTheme.primaryColor,
                                          fontFamily: AppTheme.fontFamily,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: accentColor.withValues(
                                        alpha: 0.12,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      isSuccess ? 'SUCCESS' : 'FAILED',
                                      style: TextStyle(
                                        color: accentColor,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        fontFamily: AppTheme.fontFamily,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Divider(color: context.borderColor, height: 1),
                              const SizedBox(height: 10),
                              // Amount Highlight
                              if (widget.amount != null &&
                                  widget.amount!.isNotEmpty) ...[
                                Text(
                                  widget.amount!,
                                  style: TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    fontFamily: AppTheme.fontFamily,
                                    color: isSuccess
                                        ? AppTheme.primaryColor
                                        : AppTheme.errorColor,
                                  ),
                                ),
                                const SizedBox(height: 10),
                              ],

                              // Token / PIN Widget if available
                              if (widget.pinContent != null &&
                                  widget.pinContent!.trim().isNotEmpty) ...[
                                PinDisplayWidget(
                                  pinContent: widget.pinContent!,
                                ),
                                const SizedBox(height: 10),
                              ],

                              // Transaction Details Table
                              if (widget.details != null &&
                                  widget.details!.isNotEmpty)
                                Container(
                                  padding: const EdgeInsets.all(12),
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
                                      return Padding(
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 4,
                                        ),
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              entry.key,
                                              style: TextStyle(
                                                color: context.textSecondary,
                                                fontSize: 11,
                                                fontFamily: AppTheme.fontFamily,
                                              ),
                                            ),
                                            const SizedBox(width: 14),
                                            Expanded(
                                              child: SelectableText(
                                                entry.value,
                                                textAlign: TextAlign.end,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 11,
                                                  fontFamily:
                                                      AppTheme.fontFamily,
                                                  color: context.textPrimary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    }).toList(),
                                  ),
                                ),
                              const SizedBox(height: 12),
                              Divider(color: context.borderColor, height: 1),
                              const SizedBox(height: 10),
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
                                'ufriends.com.ng  •  info@ufriends.com.ng\n+234 702 641 7709',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 9,
                                  color: context.textSecondary,
                                  fontFamily: AppTheme.fontFamily,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Slip Download / Preview Button if Slip Available
                      if (widget.slipReport != null ||
                          widget.slipDownloadUrl != null) ...[
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: _downloadingSlip
                                ? null
                                : _downloadOrViewSlip,
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
                                    size: 18,
                                  ),
                            label: Text(
                              _downloadingSlip
                                  ? 'Downloading Slip...'
                                  : 'View / Download Official Slip',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppTheme.secondaryColor,
                              side: const BorderSide(
                                color: AppTheme.secondaryColor,
                                width: 1.4,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Bottom Actions (Share Receipt & Done)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 14,
                ),
                child: Row(
                  children: [
                    // Share Receipt Button
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _showShareOptions,
                        icon: _sharingImage
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.share_outlined, size: 17),
                        label: Text(
                          _sharingImage ? 'Preparing...' : 'Share Receipt',
                          style: const TextStyle(fontSize: 13),
                        ),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: context.textPrimary,
                          side: BorderSide(color: context.borderColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Done Button
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryColor.withValues(
                                alpha: 0.28,
                              ),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(context, rootNavigator: true).pop();
                            widget.onDone?.call();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 13),
                          ),
                          child: const Text(
                            'Done',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
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
      ),
    );
  }
}
