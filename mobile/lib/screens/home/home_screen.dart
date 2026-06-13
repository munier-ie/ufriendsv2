import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import '../../core/app_theme.dart';
import '../../core/skeleton_loader.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import '../../core/auth_service.dart';

import '../../main.dart';
import '../../core/biometric_service.dart';
import '../auth/lock_screen.dart';
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

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  late int _currentIndex;
  bool _isLoading = true;
  Map<String, dynamic>? _userProfile;
  List<dynamic> _recentTransactions = [];
  
  List<dynamic> _notifications = [];
  bool _isLoadingNotifications = false;
  double _xPosition = -1.0;
  double _yPosition = -1.0;
  String? _whatsappGroupLink;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
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

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) async {
    super.didChangeAppLifecycleState(state);

    final bool isEnabled = await BiometricService.isBiometricsEnabled();
    if (!isEnabled) return;

    if (state == AppLifecycleState.paused) {
      await BiometricService.recordBackgroundTime();
    } else if (state == AppLifecycleState.resumed) {
      if (LockScreen.isShowing) return;

      final String behavior = await BiometricService.getBehavior();
      if (behavior == 'always') {
        _lockApp();
      } else if (behavior == 'timeout') {
        final int elapsedSeconds = await BiometricService.getElapsedSecondsSinceBackground();
        final int timeoutMinutes = await BiometricService.getTimeoutMinutes();
        if (elapsedSeconds >= timeoutMinutes * 60) {
          _lockApp();
        }
      }
    }
  }

  void _lockApp() {
    navigatorKey.currentState?.push(
      MaterialPageRoute(builder: (_) => const LockScreen(isOverlay: true)),
    );
  }

  Future<void> _fetchDashboardData() async {
    if (_userProfile == null) {
      setState(() => _isLoading = true);
    }
    final profileRes = await ApiService.getProfile();
    final transRes = await ApiService.getTransactions(limit: 100);
    final settingsRes = await ApiService.fetchPublicSettings();
    final notificationsRes = await ApiService.getNotifications();

    if (mounted) {
      setState(() {
        if (profileRes['success']) _userProfile = profileRes['user'];
        if (transRes['success']) _recentTransactions = transRes['transactions'];
        if (settingsRes['success']) {
          _whatsappGroupLink = settingsRes['settings']?['whatsappGroupLink'];
        }
        if (notificationsRes['success']) {
          _notifications = notificationsRes['notifications'] ?? [];
        }
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchNotifications({StateSetter? modalState}) async {
    if (!_isLoadingNotifications) {
      if (modalState == null) {
        setState(() => _isLoadingNotifications = true);
      } else {
        modalState(() => _isLoadingNotifications = true);
      }
    }
    final res = await ApiService.getNotifications();
    if (mounted) {
      if (modalState != null) {
        modalState(() {
          if (res['success']) {
            _notifications = res['notifications'] ?? [];
          }
          _isLoadingNotifications = false;
        });
      }
      setState(() {
        if (res['success']) {
          _notifications = res['notifications'] ?? [];
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
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_currentIndex != 0) {
          // Navigate back to dashboard tab first
          setState(() => _currentIndex = 0);
        } else {
          // Already on dashboard — minimize app (don't kill)
          SystemNavigator.pop();
        }
      },
      child: AnnotatedRegion<SystemUiOverlayStyle>(
      value: (context.isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark).copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: context.scaffoldBg,
        drawer: HomeDrawer(
          userProfile: _userProfile,
          onTabSelected: _onTabSelected,
          onLogout: _handleLogout,
        ),
        body: SafeArea(
          child: Stack(
            children: [
              Column(
                children: [
                  // Custom Floating TopBar
                  Container(
                    margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                    height: 56,
                    decoration: BoxDecoration(
                      color: context.glassBg,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: context.glassBorder, width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: context.glassShadow,
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
                                Text(
                                  'Ufriends IT',
                                  style: TextStyle(
                                    color: context.textPrimary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Builder(
                              builder: (context) {
                                int unreadCount = _notifications.where((n) => n['isRead'] != true).length;
                                return Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    IconButton(
                                      onPressed: () {
                                        setState(() => _isLoadingNotifications = true);
                                        _showNotificationsBottomSheet(context);
                                      },
                                      icon: const Icon(Icons.notifications_none_rounded, color: AppTheme.secondaryColor),
                                    ),
                                    if (unreadCount > 0)
                                      Positioned(
                                        right: 8,
                                        top: 8,
                                        child: Container(
                                          padding: const EdgeInsets.all(4),
                                          decoration: const BoxDecoration(
                                            color: Colors.red,
                                            shape: BoxShape.circle,
                                          ),
                                          child: Text(
                                            unreadCount > 9 ? '9+' : unreadCount.toString(),
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                );
                              },
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
              Positioned(
                left: _xPosition == -1.0 ? MediaQuery.of(context).size.width - 76 : _xPosition,
                top: _yPosition == -1.0 ? MediaQuery.of(context).size.height - 220 : _yPosition,
                child: GestureDetector(
                  onPanUpdate: (details) {
                    setState(() {
                      double currentX = _xPosition == -1.0 
                          ? MediaQuery.of(context).size.width - 76 
                          : _xPosition;
                      double currentY = _yPosition == -1.0 
                          ? MediaQuery.of(context).size.height - 220 
                          : _yPosition;
                      _xPosition = (currentX + details.delta.dx).clamp(16.0, MediaQuery.of(context).size.width - 76);
                      _yPosition = (currentY + details.delta.dy).clamp(80.0, MediaQuery.of(context).size.height - 180);
                    });
                  },
                  child: FloatingActionButton(
                    shape: const CircleBorder(),
                    onPressed: () async {
                      final String link = (_whatsappGroupLink != null && _whatsappGroupLink!.trim().isNotEmpty)
                          ? _whatsappGroupLink!
                          : 'https://chat.whatsapp.com/G4dSBWV7Pp5BLBoOtborg2';
                      final whatsappUrl = Uri.parse(link);
                      try {
                        await launchUrl(whatsappUrl, mode: LaunchMode.externalApplication);
                      } catch (e) {
                        if (context.mounted) {
                          AppToast.show(context, message: 'Could not launch WhatsApp', type: ToastType.error);
                        }
                      }
                    },
                    backgroundColor: Colors.green.shade600,
                    child: const FaIcon(FontAwesomeIcons.whatsapp, color: Colors.white, size: 28),
                  ),
                ),
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
            if (_isLoadingNotifications) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _fetchNotifications(modalState: setModalState);
              });
            }
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
                      color: context.borderColor,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Notifications',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: context.textPrimary),
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
                                      style: TextStyle(color: context.textSecondary, fontSize: 12),
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
