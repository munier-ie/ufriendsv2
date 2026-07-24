import 'package:flutter/material.dart';
import '../../../core/app_theme.dart';
import '../../../core/custom_widgets.dart';
import '../airtime_screen.dart';
import '../data_screen.dart';
import '../exam_pins_screen.dart';
import '../electricity_screen.dart';
import '../cable_tv_screen.dart';
import '../data_pins_screen.dart';
import '../airtime_to_cash_screen.dart';
import '../bvn_services_screen.dart';
import '../nin_services_screen.dart';
import '../nin_slip_screen.dart';
import '../bvn_slip_screen.dart';
import '../cac_registration_screen.dart';
import '../upgrade_screen.dart';
import '../academy_screen.dart';
import '../pos_request_screen.dart';
import '../loan_request_screen.dart';
import 'spending_chart.dart';

class DashboardTab extends StatefulWidget {
  final Map<String, dynamic>? userProfile;
  final List<dynamic> recentTransactions;
  final ValueChanged<int> onTabSelected;
  final double topPadding;
  final double bottomPadding;

  const DashboardTab({
    super.key,
    required this.userProfile,
    required this.recentTransactions,
    required this.onTabSelected,
    this.topPadding = 16.0,
    this.bottomPadding = 16.0,
  });

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  bool _showBalance = false;
  bool _showAllQuickServices = true;
  bool _showManualServices = false;
  bool _showPrintingServices = false;
  bool _showGovtServices = false;
  bool _showAccountLearning = false;
  bool _showBusinessServices = false;
  int _currentPage = 0;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.only(
        top: widget.topPadding,
        bottom: widget.bottomPadding,
        left: 16.0,
        right: 16.0,
      ),
      children: [
        _buildWalletCard(),
        const SpendingChart(),
        const SizedBox(height: 12),
        _buildQuickServices(),
        const SizedBox(height: 12),
        _buildExpandableSection(
          title: 'NIN & BVN services',
          isExpanded: _showManualServices,
          onToggle: () => setState(() => _showManualServices = !_showManualServices),
          crossAxisCount: 3,
          children: [
            _serviceItem(Icons.credit_card_rounded, 'BVN Mod', Colors.orange, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnServicesScreen(initialService: 'BVN_MODIFICATION')));
            }),
            _serviceItem(Icons.search_rounded, 'BVN Retrieval', Colors.blue, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnServicesScreen(initialService: 'BVN_RETRIEVAL')));
            }),
            _serviceItem(Icons.swap_horiz_rounded, 'VNIN', Colors.purple, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnServicesScreen(initialService: 'VNIN_NIBSS')));
            }),
            _serviceItem(Icons.smartphone_rounded, 'BVN Android', Colors.green, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnServicesScreen(initialService: 'BVN_ANDROID')));
            }),
            _serviceItem(Icons.badge_rounded, 'NIN Mod', Colors.teal, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NinServicesScreen(initialTab: 0)));
            }),
            _serviceItem(Icons.verified_rounded, 'NIN Valid', Colors.indigo, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NinServicesScreen(initialTab: 1)));
            }),
          ],
        ),
        const SizedBox(height: 12),
        _buildExpandableSection(
          title: 'NIN & BVN slip',
          isExpanded: _showPrintingServices,
          onToggle: () => setState(() => _showPrintingServices = !_showPrintingServices),
          children: [
            _serviceItem(Icons.print_rounded, 'Print NIN', Colors.teal, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NinSlipScreen()));
            }),
            _serviceItem(Icons.print_rounded, 'Print BVN', Colors.indigo, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnSlipScreen()));
            }),
          ],
        ),
        const SizedBox(height: 12),
        _buildExpandableSection(
          title: 'Business & Loans',
          isExpanded: _showBusinessServices,
          onToggle: () => setState(() => _showBusinessServices = !_showBusinessServices),
          children: [
            _serviceItem(Icons.point_of_sale_rounded, 'POS Request', Colors.green, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const PosRequestScreen()));
            }),
            _serviceItem(Icons.money_rounded, 'Loan Request', Colors.blue, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const LoanRequestScreen()));
            }),
          ],
        ),
        const SizedBox(height: 12),
        _buildExpandableSection(
          title: 'Govt Services',
          isExpanded: _showGovtServices,
          onToggle: () => setState(() => _showGovtServices = !_showGovtServices),
          children: [
            _serviceItem(Icons.business_rounded, 'CAC Reg', Colors.red, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CacRegistrationScreen()));
            }),
          ],
        ),
        const SizedBox(height: 12),
        _buildExpandableSection(
          title: 'Account & Learning',
          isExpanded: _showAccountLearning,
          onToggle: () => setState(() => _showAccountLearning = !_showAccountLearning),
          children: [
            _serviceItem(Icons.school_rounded, 'Academy', Colors.deepOrange, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AcademyScreen()));
            }),
            _serviceItem(Icons.workspace_premium_rounded, 'Upgrade', Colors.amber, onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const UpgradeScreen()));
            }),
          ],
        ),
        const SizedBox(height: 16),
        _buildRecentTransactions(),
      ],
    );
  }

  Widget _buildWalletCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        gradient: context.cardGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: context.isDark ? Colors.black.withValues(alpha: 0.4) : AppTheme.primaryColor.withValues(alpha: 0.25),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Wallet Balance',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 18),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                _showBalance ? '₦${formatCurrency((widget.userProfile?['wallet'] ?? 0).toDouble())}' : '₦ *****',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () => setState(() => _showBalance = !_showBalance),
                icon: Icon(
                  _showBalance ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                  color: Colors.white70,
                  size: 18,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _walletActionButton(Icons.add_rounded, 'Add Money', onTap: () => widget.onTabSelected(1)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _walletActionButton(Icons.history_rounded, 'History', onTap: () => widget.onTabSelected(3)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _walletActionButton(IconData icon, String label, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 1.5),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickServices() {
    final allServices = [
      _serviceItem(Icons.phone_android_rounded, 'Airtime', Colors.green, onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeScreen()));
      }),
      _serviceItem(Icons.swap_vert_rounded, 'Data', Colors.blue, onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const DataScreen()));
      }),
      _serviceItem(Icons.school_rounded, 'Exam Pin', Colors.teal, onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const ExamPinsScreen()));
      }),
      _serviceItem(Icons.bolt_rounded, 'Electricity', Colors.orange, onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const ElectricityScreen()));
      }),
      _serviceItem(Icons.tv_rounded, 'Cable TV', Colors.purple, onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const CableTvScreen()));
      }),
      _serviceItem(Icons.style_rounded, 'Data Pin', Colors.indigo, onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const DataPinsScreen()));
      }),
      _serviceItem(Icons.swap_horiz_rounded, 'Air Swap', Colors.pink, onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeToCashScreen()));
      }),
      _serviceItem(Icons.account_balance_rounded, 'Transfer', Colors.cyan),
    ];

    final visibleServices = _showAllQuickServices ? allServices : allServices.take(4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Quick Services',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            IconButton(
              icon: Icon(_showAllQuickServices ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded),
              onPressed: () => setState(() => _showAllQuickServices = !_showAllQuickServices),
            ),
          ],
        ),
        const SizedBox(height: 4),
        AnimatedSize(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          child: Wrap(
            spacing: 12,
            runSpacing: 12,
            children: visibleServices.map((e) => SizedBox(width: (MediaQuery.of(context).size.width - 68) / 4, child: e)).toList(),
          ),
        ),
      ],
    );
  }

  Widget _serviceItem(IconData icon, String label, Color color, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [color, color.withValues(alpha: 0.7)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.3),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Icon(icon, color: Colors.white, size: 28),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
        ),
      ],
      ),
    );
  }

  Widget _buildExpandableSection({
    required String title,
    required bool isExpanded,
    required VoidCallback onToggle,
    required List<Widget> children,
    int crossAxisCount = 4,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            IconButton(
              icon: Icon(isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded),
              onPressed: onToggle,
            ),
          ],
        ),
        const SizedBox(height: 4),
        AnimatedSize(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          child: isExpanded
              ? Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: children.map((e) {
                    final width = (MediaQuery.of(context).size.width - 32 - (12 * (crossAxisCount - 1))) / crossAxisCount;
                    return SizedBox(width: width, child: e);
                  }).toList(),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  Widget _buildRecentTransactions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Activity',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            TextButton(
              onPressed: () {
                widget.onTabSelected(3);
              },
              child: const Text('See All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (widget.recentTransactions.isEmpty)
          const PremiumEmptyState(
            title: 'No recent transactions',
            subtitle: 'You haven\'t made any transactions yet. Your activity will appear here.',
            icon: Icons.receipt_long_rounded,
          )
        else ...[
          ...widget.recentTransactions.skip(_currentPage * 2).take(2).map((tx) {
            String serviceName = tx['serviceName'] ?? 'Transaction';
            String desc = tx['description'] ?? '';
            double amount = double.tryParse(tx['amount'].toString()) ?? 0.0;
            String status = tx['status'] == 0 ? 'Success' : 'Failed';
            Color color = amount > 0 ? Colors.green : Colors.blue;

            return _transactionItem(
              serviceName,
              desc,
              '₦${amount.abs().toStringAsFixed(2)}',
              status,
              color,
            );
          }),
          const SizedBox(height: 16),
          // Pagination Row
          if ((widget.recentTransactions.length / 2).ceil() > 1)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Left Arrow
                GestureDetector(
                  onTap: _currentPage > 0 ? () => setState(() => _currentPage--) : null,
                  child: Icon(
                    Icons.chevron_left_rounded,
                    color: _currentPage > 0 ? context.textPrimary : context.iconMuted,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                
                // Page Numbers
                ...() {
                  final totalPages = (widget.recentTransactions.length / 2).ceil();
                  List<Widget> buttons = [];
                  
                  int startPage = 0;
                  int endPage = totalPages;
                  
                  if (totalPages > 5) {
                    if (_currentPage <= 2) {
                      startPage = 0;
                      endPage = 4;
                    } else if (_currentPage >= totalPages - 3) {
                      startPage = totalPages - 4;
                      endPage = totalPages;
                    } else {
                      startPage = _currentPage - 1;
                      endPage = _currentPage + 2;
                    }
                  }
                  
                  if (startPage > 0) {
                    buttons.add(_pageButton(0));
                    if (startPage > 1) buttons.add(_ellipsis());
                  }
                  
                  for (int i = startPage; i < endPage; i++) {
                    buttons.add(_pageButton(i));
                  }
                  
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) buttons.add(_ellipsis());
                    buttons.add(_pageButton(totalPages - 1));
                  }
                  
                  return buttons;
                }(),
                
                const SizedBox(width: 12),
                // Right Arrow
                GestureDetector(
                  onTap: _currentPage < ((widget.recentTransactions.length / 2).ceil() - 1) ? () => setState(() => _currentPage++) : null,
                  child: Icon(
                    Icons.chevron_right_rounded,
                    color: _currentPage < ((widget.recentTransactions.length / 2).ceil() - 1) ? context.textPrimary : context.iconMuted,
                    size: 24,
                  ),
                ),
              ],
            ),
        ],
      ],
    );
  }

  Widget _transactionItem(String title, String desc, String amount, String status, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.dividerColor),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.receipt_long_rounded, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text(desc, style: TextStyle(color: context.textSecondary, fontSize: 13)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 4),
              Text(
                status,
                style: const TextStyle(color: AppTheme.successColor, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _pageButton(int index) {
    final isActive = _currentPage == index;
    return GestureDetector(
      onTap: () => setState(() => _currentPage = index),
      child: Container(
        width: 32,
        height: 32,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF1E90FF) : Colors.transparent,
          shape: BoxShape.circle,
          boxShadow: isActive ? [
            BoxShadow(
              color: const Color(0xFF1E90FF).withValues(alpha: 0.3),
              blurRadius: 6,
              spreadRadius: 2,
            ),
          ] : [],
        ),
        child: Center(
          child: Text(
            '${index + 1}',
            style: TextStyle(
              color: isActive ? Colors.white : context.textPrimary,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  Widget _ellipsis() {
    return Container(
      width: 32,
      height: 32,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: const BoxDecoration(
        color: Colors.transparent,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          '...',
          style: TextStyle(color: context.textPrimary, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
