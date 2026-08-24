import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/skeleton_loader.dart';
import '../../core/api_service.dart';
import '../../core/custom_widgets.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'slip_preview_screen.dart';
import '../../widgets/pin_display_widget.dart';
import 'package:flutter/rendering.dart';
import 'dart:ui' as ui;
import 'dart:io';
import 'dart:typed_data';

class ActivityScreen extends StatefulWidget {
  final Future<void> Function() onRefresh;
  final double topPadding;
  final double bottomPadding;

  const ActivityScreen({
    super.key,
    required this.onRefresh,
    this.topPadding = 16.0,
    this.bottomPadding = 16.0,
  });

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  List<dynamic> _transactions = [];
  List<dynamic> _filteredTransactions = [];
  bool _isLoading = true;
  String? _selectedType;

  @override
  void initState() {
    super.initState();
    _fetchTransactions();
  }

  Future<void> _fetchTransactions() async {
    setState(() => _isLoading = true);
    try {
      // For slip/manual pseudo-filters, fetch all 'professional' from the API
      final apiType = (_selectedType == 'professional_slip' || _selectedType == 'professional_manual')
          ? 'professional'
          : _selectedType;

      final res = await ApiService.getTransactions(limit: 50, type: apiType);
      if (res['success']) {
        final all = res['transactions'] ?? [];
        List<dynamic> filtered = all;

        if (_selectedType == 'professional_slip') {
          filtered = all.where((tx) {
            final name = (tx['serviceName'] ?? '').toString().toUpperCase();
            return name.contains('SLIP');
          }).toList();
        } else if (_selectedType == 'professional_manual') {
          filtered = all.where((tx) {
            final name = (tx['serviceName'] ?? '').toString().toUpperCase();
            return !name.contains('SLIP');
          }).toList();
        }

        setState(() {
          _transactions = all;
          _filteredTransactions = filtered;
        });
      }
    } catch (e) {
      debugPrint('Error fetching transactions: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  String formatDate(dynamic dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      DateTime dt = DateTime.parse(dateStr.toString());
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateStr.toString();
    }
  }

  void _showTransactionDetails(Map<String, dynamic> tx) {
    final bool isDebit = (tx['amount'] ?? 0) < 0;
    final bool isSuccess = tx['status'] == 0 || tx['status'] == '0';
    final bool isFailed = tx['status'] == 1 || tx['status'] == '1';
    final String status = isSuccess ? 'Success' : (isFailed ? 'Failed' : 'Pending');
    final Color statusColor = isSuccess ? Colors.green : (isFailed ? Colors.red : Colors.orange);
    final bool isSlipTransaction = (tx['serviceName'] ?? '').toString().toLowerCase().contains('slip') ||
                                   (tx['serviceName'] ?? '').toString().toLowerCase().contains('bvn') ||
                                   (tx['serviceName'] ?? '').toString().toLowerCase().contains('nin');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: context.bottomSheetBg,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Transaction Details',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              _detailRow('Service', tx['serviceName'] ?? 'N/A'),
              _detailRow('Amount', '${isDebit ? '-' : '+'}₦${formatCurrency((tx['amount'] ?? 0).abs().toDouble())}'),
              _detailRow('Status', status, valueColor: statusColor),
              _detailRow('Date', formatDate(tx['date'])),
              _detailRow('Description', tx['description'] ?? 'N/A'),
              if (tx['pinContent'] != null && tx['pinContent'].toString().trim().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: PinDisplayWidget(pinContent: tx['pinContent'].toString()),
                ),
              const SizedBox(height: 32),
              Row(
                children: [
                  if (isSlipTransaction && isSuccess)
                    Expanded(
                      child: GradientButton(
                        text: 'Download Slip',
                        icon: Icons.download_rounded,
                        onPressed: () async {
                          AppToast.show(context, message: 'Fetching slip details...', type: ToastType.success);
                          final res = await ApiService.getTransaction(tx['reference']);
                          if (res['success'] == true) {
                            final fullTx = res['transaction'];
                            if (fullTx['report'] != null && context.mounted) {
                              Navigator.pop(context); // close details modal
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => SlipPreviewScreen(
                                    report: fullTx['report'],
                                    slipType: fullTx['slipType'] ?? 'bvn',
                                    selectedSlipVariant: fullTx['slipVariant'] ?? 'regular',
                                  ),
                                ),
                              );
                            } else if (context.mounted) {
                              AppToast.show(context, message: 'Slip not found', type: ToastType.error);
                            }
                          } else if (context.mounted) {
                            AppToast.show(context, message: res['error'] ?? 'Failed to fetch slip', type: ToastType.error);
                          }
                        },
                      ),
                    )
                  else
                    Expanded(
                      child: GradientButton(
                        text: 'Print Receipt',
                        icon: Icons.print_rounded,
                        onPressed: () {
                          Navigator.pop(context); // Close details drawer
                          _showReceiptDialog(tx);
                        },
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _detailRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: context.textSecondary, fontSize: 14)),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: valueColor),
            ),
          ),
        ],
      ),
    );
  }

  void _showReceiptDialog(Map<String, dynamic> tx) {
    final GlobalKey receiptKey = GlobalKey();
    
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: context.cardColor,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                RepaintBoundary(
                  key: receiptKey,
                  child: Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(8),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Ufriends',
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Transaction Receipt',
                          style: TextStyle(fontSize: 14, color: context.textSecondary),
                        ),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: context.subtleBg,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            children: [
                              _receiptRow('Reference', tx['reference'] ?? 'N/A'),
                              _receiptRow('Service', tx['serviceName'] ?? 'N/A'),
                              _receiptRow('Amount', '₦${formatCurrency((tx['amount'] ?? 0).abs().toDouble())}'),
                              _receiptRow('Date', formatDate(tx['date'])),
                              _receiptRow('Description', tx['description'] ?? 'N/A'),
                              if (tx['pinContent'] != null && tx['pinContent'].toString().trim().isNotEmpty) ...[
                                ...parsePinTokens(tx['pinContent'].toString()).asMap().entries.map((entry) {
                                  final idx = entry.key;
                                  final tok = entry.value;
                                  final isMultiple = parsePinTokens(tx['pinContent'].toString()).length > 1;
                                  final pinLabel = isMultiple ? 'PIN #${idx + 1}' : 'PIN';
                                  final serialLabel = isMultiple ? 'Serial #${idx + 1}' : 'Serial No';

                                  return Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      _receiptRow(pinLabel, tok.pin),
                                      if (tok.serial != null) _receiptRow(serialLabel, tok.serial!),
                                    ],
                                  );
                                }),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Thank you for using Ufriends!',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Close'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GradientButton(
                        text: 'Share',
                        onPressed: () async {
                          try {
                            RenderRepaintBoundary boundary = receiptKey.currentContext!.findRenderObject() as RenderRepaintBoundary;
                            ui.Image image = await boundary.toImage(pixelRatio: 3.0);
                            ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
                            Uint8List pngBytes = byteData!.buffer.asUint8List();

                            final tempDir = await getTemporaryDirectory();
                            final file = await File('${tempDir.path}/receipt_${tx['reference'] ?? 'tx'}.png').create();
                            await file.writeAsBytes(pngBytes);

                            await SharePlus.instance.share(
                              ShareParams(
                                files: [XFile(file.path)],
                                text: 'Ufriends Receipt',
                              ),
                            );
                          } catch (e) {
                            if (context.mounted) {
                              AppToast.show(context, message: 'Failed to share image: $e', type: ToastType.error);
                            }
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _receiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: context.textSecondary, fontSize: 12)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String? type) {
    final isSelected = _selectedType == type;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedType = type;
        });
        _fetchTransactions();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1E90FF) : (context.isDark ? Colors.grey.shade800 : Colors.grey[200]),
          borderRadius: BorderRadius.circular(20),
          boxShadow: isSelected ? [
            BoxShadow(
              color: const Color(0xFF1E90FF).withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 4),
            )
          ] : null,
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : (context.isDark ? Colors.grey.shade300 : Colors.black87),
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      triggerMode: RefreshIndicatorTriggerMode.anywhere,
      edgeOffset: widget.topPadding,
      onRefresh: () async {
        await _fetchTransactions();
        await widget.onRefresh();
      },
      color: AppTheme.primaryColor,
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        slivers: [
          SliverPadding(
            padding: EdgeInsets.fromLTRB(16, widget.topPadding, 16, 8),
            sliver: const SliverToBoxAdapter(
              child: Text(
                'Transaction History',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
            ),
          ),
            SliverToBoxAdapter(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    _buildFilterChip('All', null),
                    const SizedBox(width: 8),
                    _buildFilterChip('Airtime', 'airtime'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Data', 'data'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Cable', 'cable'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Electricity', 'electricity'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Cards', 'recharge_card'),
                    const SizedBox(width: 8),
                    _buildFilterChip('A2C', 'airtime2cash'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Printing', 'professional_slip'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Manual', 'professional_manual'),
                    const SizedBox(width: 8),
                    _buildFilterChip('E-Pins', 'pin'),
                  ],
                ),
              ),
            ),
            if (_isLoading)
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => const SkeletonListTile(),
                  childCount: 5,
                ),
              )
            else if (_transactions.isEmpty)
              SliverFillRemaining(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    Text('No transactions yet', style: TextStyle(color: context.textMuted)),
                  ],
                ),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final tx = _filteredTransactions[index];
                    return _buildTransactionItem(tx);
                  },
                  childCount: _filteredTransactions.length,
                ),
              ),
            SliverPadding(padding: EdgeInsets.only(bottom: widget.bottomPadding)),
          ],
        ),
      );
  }

  Widget _buildTransactionItem(Map<String, dynamic> tx) {
    final bool isDebit = (tx['amount'] ?? 0) < 0;
    final String status = tx['status'] == 0 ? 'Success' : tx['status'] == 1 ? 'Failed' : 'Pending';
    final Color statusColor = tx['status'] == 0 ? Colors.green : tx['status'] == 1 ? Colors.red : Colors.orange;

    return InkWell(
      onTap: () => _showTransactionDetails(tx),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.cardColor,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: (isDebit ? Colors.red : Colors.green).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                isDebit ? Icons.arrow_outward_rounded : Icons.arrow_downward_rounded,
                color: isDebit ? Colors.red : Colors.green,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tx['serviceName'] ?? 'Transaction',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    tx['description'] ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: context.textSecondary, fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatDate(tx['date']),
                    style: TextStyle(color: context.iconMuted, fontSize: 10),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${isDebit ? '-' : '+'}₦${formatCurrency((tx['amount'] ?? 0).abs().toDouble())}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: isDebit ? Colors.red.shade700 : Colors.green.shade700,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
