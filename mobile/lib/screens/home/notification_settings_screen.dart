import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> with WidgetsBindingObserver {
  bool _pushNotifications = false;
  bool _emailNotifications = true;
  bool _transactionAlerts = true;
  bool _promotionalOffers = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPermissionStatus();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkPermissionStatus();
    }
  }

  Future<void> _checkPermissionStatus() async {
    final status = await Permission.notification.status;
    if (mounted) {
      setState(() {
        _pushNotifications = status.isGranted;
      });
    }
  }

  Future<void> _togglePushNotifications(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('push_notifications', value);
    
    if (value) {
      final status = await Permission.notification.request();
      if (status.isGranted) {
        if (mounted) setState(() => _pushNotifications = true);
        if (mounted) AppToast.show(context, message: 'Notifications enabled', type: ToastType.success);
      } else if (status.isPermanentlyDenied) {
        if (mounted) showPermissionDeniedDrawer(context);
      } else {
        if (mounted) setState(() => _pushNotifications = false);
      }
    } else {
      if (mounted) setState(() => _pushNotifications = false);
      if (mounted) AppToast.show(context, message: 'Push notifications disabled', type: ToastType.warning);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Notification Settings',
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppTheme.secondaryColor),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildSection(
            'General Notifications',
            [
              _buildSwitchItem(
                'Push Notifications',
                'Receive alerts on your device',
                _pushNotifications,
                _togglePushNotifications,
              ),
              _buildSwitchItem(
                'Email Notifications',
                'Get updates in your inbox',
                _emailNotifications,
                (val) async {
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.setBool('email_notifications', val);
                  setState(() => _emailNotifications = val);
                },
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildSection(
            'Activity Alerts',
            [
              _buildSwitchItem(
                'Transaction Alerts',
                'Notifications for every wallet activity',
                _transactionAlerts,
                (val) async {
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.setBool('transaction_alerts', val);
                  setState(() => _transactionAlerts = val);
                },
              ),
              _buildSwitchItem(
                'Promotional Offers',
                'Stay updated on latest deals',
                _promotionalOffers,
                (val) async {
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.setBool('promotional_offers', val);
                  setState(() => _promotionalOffers = val);
                },
              ),
            ],
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.blue.withValues(alpha: 0.1)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline_rounded, color: AppTheme.secondaryColor),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'You can also manage system-level notifications in your device settings.',
                    style: TextStyle(color: Colors.blue, fontSize: 12, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Colors.grey.shade500,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildSwitchItem(String title, String subtitle, bool value, Function(bool) onChanged) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
      ),
      trailing: Switch.adaptive(
        value: value,
        onChanged: onChanged,
        activeTrackColor: const Color(0xFF1E90FF),
        activeThumbColor: Colors.white,
      ),
    );
  }
}
