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
import 'profile_screen.dart';

import 'widgets/floating_nav_bar.dart';
import 'widgets/home_drawer.dart';
import 'widgets/dashboard_tab.dart';

class HomeScreen extends StatefulWidget {
  final int initialIndex;
  const HomeScreen({super.key, this.initialIndex = 0});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late int _currentIndex;
  bool _isLoading = true;
  Map<String, dynamic>? _userProfile;
  List<dynamic> _recentTransactions = [];
  
  List<dynamic> _notifications = [];
  bool _isLoadingNotifications = false;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _fetchDashboardData();
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

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        drawer: HomeDrawer(
          userProfile: _userProfile,
          onTabSelected: _onTabSelected,
          onLogout: _handleLogout,
        ),
        body: SafeArea(
          child: Column(
            children: [
              // Custom Floating TopBar
              Container(
                margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.90),
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
                    filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
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
        bottomNavigationBar: FloatingNavBar(
          currentIndex: _currentIndex,
          onTabSelected: _onTabSelected,
        ),
        extendBody: true, // Important for the floating navbar effect
      ),
    );
  }

  Widget _buildBody() {
    switch (_currentIndex) {
      case 0: return RefreshIndicator(
        onRefresh: _fetchDashboardData,
        color: AppTheme.primaryColor,
        child: DashboardTab(
          userProfile: _userProfile,
          recentTransactions: _recentTransactions,
          onTabSelected: _onTabSelected,
        ),
      );
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
      default: return RefreshIndicator(
        onRefresh: _fetchDashboardData,
        color: AppTheme.primaryColor,
        child: DashboardTab(
          userProfile: _userProfile,
          recentTransactions: _recentTransactions,
          onTabSelected: _onTabSelected,
        ),
      );
    }
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
                            ? const PremiumEmptyState(
                                title: 'No notifications yet',
                                subtitle: 'You have no new notifications. We\'ll let you know when something arrives.',
                                icon: Icons.notifications_off_rounded,
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
}
