import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/app_theme.dart';
import '../../core/skeleton_loader.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import '../../core/auth_service.dart';
import '../auth/login_screen.dart';
import 'wallet_screen.dart';
import 'services_screen.dart';
import 'activity_screen.dart';
import 'airtime_screen.dart';
import 'airtime_to_cash_screen.dart';
import 'recharge_cards_screen.dart';

import 'data_screen.dart';

import 'profile_screen.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/chart_utils.dart';

class HomeScreen extends StatefulWidget {
  final int initialIndex;
  const HomeScreen({super.key, this.initialIndex = 0});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late int _currentIndex;
  bool _showBalance = false;
  bool _isLoading = true;
  Map<String, dynamic>? _userProfile;
  List<dynamic> _recentTransactions = [];
  bool _showAllQuickServices = false;
  bool _showManualServices = false;
  bool _showPrintingServices = false;
  bool _showGovtServices = false;
  String _selectedTimeframe = '7D';
  int? _showingTooltipSpot;
  int _currentPage = 0;
  List<dynamic> _notifications = [];
  bool _isLoadingNotifications = false;
  List<dynamic> _chartData = [];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _fetchDashboardData();
    _fetchChartData();
    _checkNotificationPermission();
  }

  Future<void> _checkNotificationPermission() async {
    final status = await Permission.notification.status;
    if (status.isDenied) {
      final result = await Permission.notification.request();
      if (result.isPermanentlyDenied) {
        if (mounted) showPermissionDeniedDrawer(context);
      }
    } else if (status.isPermanentlyDenied) {
      if (mounted) showPermissionDeniedDrawer(context);
    }
  }



  Future<void> _fetchDashboardData() async {
    if (_userProfile == null) {
      setState(() => _isLoading = true);
    }
    final profileRes = await ApiService.getProfile();
    final transRes = await ApiService.getTransactions(limit: 100);

    if (mounted) {
      setState(() {
        if (profileRes['success']) _userProfile = profileRes['user'];
        if (transRes['success']) _recentTransactions = transRes['transactions'];
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchChartData() async {
    final period = _selectedTimeframe.toLowerCase();
    final res = await ApiService.getChartData(period);
    if (mounted) {
      setState(() {
        if (res['success']) _chartData = res['chartData'] ?? [];
      });
    }
  }

  Future<void> _fetchNotifications() async {
    setState(() => _isLoadingNotifications = true);
    final res = await ApiService.getNotifications();
    if (mounted) {
      setState(() {
        if (res['success']) {
          _notifications = res['notifications'];
        }
        _isLoadingNotifications = false;
      });
    }
  }

  Future<void> _handleLogout() async {
    await AuthService.logout();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        drawer: _buildDrawer(),
        body: SafeArea(
          child: Column(
            children: [
              // Custom Floating TopBar
              Container(
                margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 15,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: Row(
                      children: [
                        const SizedBox(width: 8),
                        Builder(
                          builder: (context) => IconButton(
                            icon: const Icon(Icons.menu_rounded, color: AppTheme.secondaryColor),
                            onPressed: () => Scaffold.of(context).openDrawer(),
                          ),
                        ),
                        const Spacer(),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const AppLogo(size: 24),
                            const SizedBox(width: 8),
                            const Text(
                              'Ufriends IT',
                              style: TextStyle(
                                color: Colors.black87,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),
                        Builder(
                          builder: (context) => IconButton(
                            onPressed: () {
                              _fetchNotifications();
                              _showNotificationsBottomSheet(context);
                            },
                            icon: const Icon(Icons.notifications_none_rounded, color: AppTheme.secondaryColor),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                    ),
                  ),
                ),
              ),
              Expanded(
                child: _isLoading 
                    ? ListView(
                        padding: const EdgeInsets.all(16.0),
                        children: [
                          const Skeleton(height: 150),
                          const SizedBox(height: 16),
                          const Skeleton(height: 180),
                          const SizedBox(height: 16),
                          const Skeleton(height: 100),
                          const SizedBox(height: 16),
                          const SkeletonListTile(),
                          const SkeletonListTile(),
                        ],
                      )
                    : _buildBody(),
              ),
            ],
          ),
        ),
        bottomNavigationBar: _buildFloatingNavbar(),
        extendBody: true, // This is important for the floating navbar effect
      ),
    );
  }

  Widget _buildBody() {
    switch (_currentIndex) {
      case 0: return _buildDashboard();
      case 1: return WalletScreen(
        userProfile: _userProfile, 
        onRefresh: _fetchDashboardData,
      );
      case 2: return ServicesScreen(
        onRefresh: _fetchDashboardData,
      );
      case 3: return ActivityScreen(
        onRefresh: _fetchDashboardData,
      );
      case 4: return ProfileScreen(
        userProfile: _userProfile,
        onRefresh: _fetchDashboardData,
      );
      default: return _buildDashboard();
    }
  }

  Widget _buildDashboard() {
    return RefreshIndicator(
      onRefresh: _fetchDashboardData,
      color: AppTheme.primaryColor,
      child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildWalletCard(),
          _buildSpendingChart(),
          const SizedBox(height: 12),
          _buildQuickServices(),
          const SizedBox(height: 12),
          _buildExpandableSection(
            title: 'Manual Services',
            isExpanded: _showManualServices,
            onToggle: () => setState(() => _showManualServices = !_showManualServices),
            crossAxisCount: 3,
            children: [
              _serviceItem(Icons.credit_card_rounded, 'BVN Mod', Colors.orange),
              _serviceItem(Icons.search_rounded, 'BVN Retrieval', Colors.blue),
              _serviceItem(Icons.swap_horiz_rounded, 'VNIN', Colors.purple),
              _serviceItem(Icons.smartphone_rounded, 'BVN Android', Colors.green),
              _serviceItem(Icons.badge_rounded, 'NIN Mod', Colors.teal),
              _serviceItem(Icons.verified_rounded, 'NIN Valid', Colors.indigo),
            ],
          ),
          const SizedBox(height: 12),
          _buildExpandableSection(
            title: 'Printing Services',
            isExpanded: _showPrintingServices,
            onToggle: () => setState(() => _showPrintingServices = !_showPrintingServices),
            children: [
              _serviceItem(Icons.print_rounded, 'Print NIN', Colors.teal),
              _serviceItem(Icons.print_rounded, 'Print BVN', Colors.indigo),
            ],
          ),
          const SizedBox(height: 12),
          _buildExpandableSection(
            title: 'Govt Services',
            isExpanded: _showGovtServices,
            onToggle: () => setState(() => _showGovtServices = !_showGovtServices),
            children: [
              _serviceItem(Icons.business_rounded, 'CAC Reg', Colors.red),
            ],
          ),
          const SizedBox(height: 16),
          _buildRecentTransactions(),
          const SizedBox(height: 100), // Space for floating navbar
        ],
      ),
    );
  }

  Widget _buildSpendingChart() {
    // Use backend chart data fetched per-timeframe
    final List<FlSpot> spots;
    final int daysCount;

    if (_chartData.isNotEmpty) {
      daysCount = _chartData.length;
      spots = List.generate(_chartData.length, (i) {
        final val = double.tryParse(_chartData[i]['spent'].toString()) ?? 0.0;
        return FlSpot(i.toDouble(), val);
      });
    } else {
      // Placeholder: all zeros while loading or no data
      daysCount = _selectedTimeframe == '1M' ? 30 : _selectedTimeframe == '1Y' ? 365 : 7;
      spots = List.generate(daysCount, (i) => FlSpot(i.toDouble(), 0));
    }

    final spots2 = spots;

    // Calculate Y-axis scale based on actual data
    double maxSpending = 0;
    if (spots2.isNotEmpty) {
      maxSpending = spots2.map((e) => e.y).reduce((a, b) => a > b ? a : b);
    }

    final scale = ChartUtils.calculateNiceScale(maxSpending, 5);
    final double maxY = scale['maxY']!;
    final double interval = scale['interval']!;

    final barData = LineChartBarData(
      spots: spots2,
      isCurved: true,
      color: const Color(0xFF1E90FF),
      barWidth: 2,
      isStrokeCapRound: true,
      preventCurveOverShooting: true, // Fix curve dipping below 0
      dotData: const FlDotData(show: false), // Remove circles
      belowBarData: BarAreaData(
        show: true,
        color: const Color(0xFF1E90FF).withValues(alpha: 0.1),
      ),
    );

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
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
                'Spending Overview',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Row(
                children: ['7D', '1M', '1Y'].map((tf) {
                  bool isSelected = _selectedTimeframe == tf;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedTimeframe = tf;
                        _showingTooltipSpot = null;
                      });
                      _fetchChartData();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      margin: const EdgeInsets.only(left: 4),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF1E90FF) : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        tf,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : Colors.grey.shade600,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                lineTouchData: LineTouchData(
                  handleBuiltInTouches: false,
                  touchCallback: (FlTouchEvent event, LineTouchResponse? touchResponse) {
                    if (event is FlTapUpEvent && touchResponse?.lineBarSpots != null && touchResponse!.lineBarSpots!.isNotEmpty) {
                      setState(() {
                        final spotIndex = touchResponse.lineBarSpots![0].spotIndex;
                        _showingTooltipSpot = spotIndex;
                      });
                    }
                  },
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (touchedSpot) => const Color(0xFF1E90FF),
                    getTooltipItems: (touchedSpots) {
                      return touchedSpots.map((spot) {
                        return LineTooltipItem(
                          '₦${formatCurrency(spot.y)}',
                          const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        );
                      }).toList();
                    },
                  ),
                ),
                gridData: const FlGridData(show: false),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      // Show every label for 7D, every 5th for 1M, every 30th for 1Y
                      interval: daysCount <= 7 ? 1 : (daysCount <= 30 ? 5 : 60),
                      getTitlesWidget: (value, meta) {
                        final idx = value.toInt();
                        if (idx < 0 || idx >= _chartData.length) return const Text('');
                        final label = _chartData[idx]['name']?.toString() ?? '';
                        return Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(label, style: const TextStyle(fontSize: 9, color: Colors.grey)),
                        );
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 44,
                      interval: interval,
                      getTitlesWidget: (value, meta) {
                        if (value == 0) return const Text('');
                        return Text('₦${ChartUtils.formatCompactValue(value)}', style: const TextStyle(fontSize: 9, color: Colors.grey));
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: (daysCount - 1).toDouble(),
                minY: 0,
                maxY: maxY,
                lineBarsData: [barData],
                showingTooltipIndicators: (_showingTooltipSpot != null && spots2.isNotEmpty && _showingTooltipSpot! < spots2.length)
                    ? [
                        ShowingTooltipIndicators([
                          LineBarSpot(barData, 0, barData.spots[_showingTooltipSpot!]),
                        ])
                      ]
                    : [],
              ),
            ),
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

  Widget _buildFloatingNavbar() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 30), // Smaller horizontal margin for a wider pill
      height: 76, // Increased height
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.85), // Slightly more opaque for better contrast
        borderRadius: BorderRadius.circular(38),
        border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15), // Deeper shadow
            blurRadius: 25,
            spreadRadius: 2,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(38),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12), // Real blur effect
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _navItem(0, Icons.home_rounded, 'Home'),
              _navItem(1, Icons.account_balance_wallet_rounded, 'Wallet'),
              _navItem(2, Icons.grid_view_rounded, 'Services'),
              _navItem(3, Icons.receipt_long_rounded, 'Activity'),
              _navItem(4, Icons.person_rounded, 'Profile'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label) {
    bool isActive = _currentIndex == index;
    const Color activeColor = Color(0xFF1E90FF); // DodgerBlue
    
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? activeColor.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Icon(
              icon, 
              color: isActive ? activeColor : Colors.grey.shade600, 
              size: 24
            ),
            if (isActive) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: activeColor, 
                  fontWeight: FontWeight.bold, 
                  fontSize: 13
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer() {
    final double drawerWidth = MediaQuery.of(context).size.width * 0.75;
    return SizedBox(
      width: drawerWidth,
      child: Drawer(
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.only(
            topRight: Radius.circular(AppTheme.borderRadius),
            bottomRight: Radius.circular(AppTheme.borderRadius),
          ),
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 60, 20, 30),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(bottom: BorderSide(color: Color(0xFFF0F0F0), width: 1)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF1E90FF), width: 2),
                    ),
                    child: const CircleAvatar(
                      radius: 35,
                      backgroundColor: Color(0xFFF8F9FA),
                      child: Icon(Icons.person, color: Color(0xFF1E90FF), size: 40),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _userProfile != null ? (_userProfile!['name'] ?? '${_userProfile!['firstName']} ${_userProfile!['lastName']}') : 'Loading...',
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold, 
                      color: Colors.black87, 
                      fontSize: 18,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _userProfile?['email'] ?? '...',
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.grey.shade600, 
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            
            // Scrollable Menu Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
                children: [
                  _drawerItem(Icons.workspace_premium_rounded, 'Upgrade Account', false),
                  _drawerItem(Icons.dashboard_outlined, 'Dashboard', true),
                  _drawerItem(Icons.grid_view_rounded, 'Services', false, onTap: () {
                    Navigator.pop(context);
                    setState(() => _currentIndex = 2);
                  }),
                  _drawerItem(Icons.swap_vert_rounded, 'Data', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const DataScreen()));
                  }),
                  _drawerItem(Icons.phone_android_rounded, 'Airtime', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeScreen()));
                  }),
                  _drawerItem(Icons.account_balance_rounded, 'Gov Services', false),
                  _drawerItem(Icons.shopping_bag_outlined, 'Exam PINs', false),
                  _drawerItem(Icons.swap_horizontal_circle_outlined, 'Airtime2cash', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeToCashScreen()));
                  }),
                  _drawerItem(Icons.edit_note_rounded, 'Manual Services', false),
                  _drawerItem(Icons.print_rounded, 'Recharge Cards', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const RechargeCardsScreen()));
                  }),
                  _drawerItem(Icons.emoji_emotions_outlined, 'Smile Data', false),

                  _drawerItem(Icons.tag_rounded, 'Data PINs', false),
                  _drawerItem(Icons.history_rounded, 'Transactions', false),
                  _drawerItem(Icons.price_change_outlined, 'Pricing', false),
                  _drawerItem(Icons.message_outlined, 'Bulk SMS', false),
                  _drawerItem(Icons.people_outline, 'Referrals', false),
                  _drawerItem(Icons.school_outlined, 'Academy', false),

                  _drawerItem(Icons.business_center_outlined, 'Become a Reseller', false),
                  _drawerItem(Icons.help_outline_rounded, 'Support Center', false),
                  _drawerItem(Icons.person_outline_rounded, 'Profile', false, onTap: () {
                    Navigator.pop(context);
                    setState(() => _currentIndex = 4);
                  }),
                ],
              ),
            ),
            
            // Fixed Bottom Logout Button
            Padding(
              padding: const EdgeInsets.all(20),
              child: GestureDetector(
                onTap: _handleLogout,
                child: Container(
                  width: double.infinity,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(25),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Sign Out',
                    style: TextStyle(
                      color: Colors.black87,
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _drawerItem(IconData icon, String title, bool selected, {Color? color, VoidCallback? onTap}) {
    const Color activeColor = Color(0xFF1E90FF); // DodgerBlue
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 2),
      decoration: BoxDecoration(
        color: selected ? activeColor.withValues(alpha: 0.08) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        visualDensity: const VisualDensity(vertical: -2),
        leading: Icon(
          icon, 
          color: color ?? (selected ? activeColor : Colors.grey.shade600),
          size: 22,
        ),
        title: Text(
          title,
          style: TextStyle(
            color: color ?? (selected ? activeColor : Colors.black87),
            fontWeight: selected ? FontWeight.bold : FontWeight.w500,
            fontSize: 14,
          ),
        ),
        selected: selected,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: onTap ?? () {},
      ),
    );
  }

  void _showNotificationsBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
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
                    'Notifications',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: MediaQuery.of(context).size.height * 0.5,
                    child: _isLoadingNotifications
                        ? ListView.builder(
                            itemCount: 5,
                            itemBuilder: (context, index) => const SkeletonListTile(),
                          )
                        : _notifications.isEmpty
                            ? const Center(
                                child: Text(
                                  'No notifications yet',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              )
                            : ListView.builder(
                                itemCount: _notifications.length,
                                itemBuilder: (context, index) {
                                  final notification = _notifications[index];
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(
                                      notification['title'] ?? 'Notification',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    subtitle: Text(
                                      notification['message'] ?? '',
                                      style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                                    ),
                                    trailing: IconButton(
                                      icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                                      onPressed: () async {
                                        final res = await ApiService.deleteNotification(notification['id'].toString());
                                        if (res['success']) {
                                          setModalState(() {
                                            _notifications.removeAt(index);
                                          });
                                          setState(() {});
                                        }
                                      },
                                    ),
                                  );
                                },
                              ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }





  Widget _buildWalletCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.25),
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
                _showBalance ? '₦${formatCurrency((_userProfile?['wallet'] ?? 0).toDouble())}' : '₦ *****',
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
                child: _walletActionButton(Icons.add_rounded, 'Add Money', onTap: () => setState(() => _currentIndex = 1)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _walletActionButton(Icons.history_rounded, 'History', onTap: () => setState(() => _currentIndex = 3)),
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
      _serviceItem(Icons.school_rounded, 'Exam Pin', Colors.teal),
      _serviceItem(Icons.bolt_rounded, 'Electricity', Colors.orange),
      _serviceItem(Icons.tv_rounded, 'Cable TV', Colors.purple),
      _serviceItem(Icons.style_rounded, 'Data Pin', Colors.indigo),
      _serviceItem(Icons.swap_horiz_rounded, 'Air Swap', Colors.pink),
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
                setState(() => _currentIndex = 3);
              },
              child: const Text('See All'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_recentTransactions.isEmpty)
          const Center(child: Text('No recent transactions', style: TextStyle(color: Colors.grey)))
        else ...[
          ..._recentTransactions.skip(_currentPage * 2).take(2).map((tx) {
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
          if ((_recentTransactions.length / 2).ceil() > 1)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Left Arrow
                GestureDetector(
                  onTap: _currentPage > 0 ? () => setState(() => _currentPage--) : null,
                  child: Icon(
                    Icons.chevron_left_rounded,
                    color: _currentPage > 0 ? Colors.black87 : Colors.grey[400],
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                
                // Page Numbers
                ...() {
                  final totalPages = (_recentTransactions.length / 2).ceil();
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
                  onTap: _currentPage < ((_recentTransactions.length / 2).ceil() - 1) ? () => setState(() => _currentPage++) : null,
                  child: Icon(
                    Icons.chevron_right_rounded,
                    color: _currentPage < ((_recentTransactions.length / 2).ceil() - 1) ? Colors.black87 : Colors.grey[400],
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
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
                Text(desc, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
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
              color: isActive ? Colors.white : Colors.black87,
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
      child: const Center(
        child: Text(
          '...',
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
