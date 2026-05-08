import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import 'notification_settings_screen.dart';
import 'pin_settings_screen.dart';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic>? userProfile;
  final Future<void> Function() onRefresh;

  const ProfileScreen({super.key, this.userProfile, required this.onRefresh});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: widget.onRefresh,
        color: AppTheme.primaryColor,
        child: ListView(
          padding: const EdgeInsets.all(16),
        children: [
          _buildHeader(),
          const SizedBox(height: 24),
          _buildInfoSection(),
          const SizedBox(height: 24),
          _buildSettingsSection(),
          const SizedBox(height: 24),
          _buildSecuritySection(),
          const SizedBox(height: 100),
        ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final user = widget.userProfile;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          const CircleAvatar(
            radius: 40,
            backgroundColor: Colors.white24,
            child: Icon(Icons.person_rounded, color: Colors.white, size: 40),
          ),
          const SizedBox(height: 16),
          Text(
            user != null ? (user['name'] ?? '${user['firstName']} ${user['lastName']}') : 'Loading...',
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
          ),
          Text(
            user?['email'] ?? '...',
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              user?['accountType']?.toUpperCase() ?? 'USER',
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection() {
    final user = widget.userProfile;
    return _buildSection(
      'Personal Information',
      [
        _infoItem(Icons.smartphone_rounded, 'Phone', user?['phone'] ?? '...'),
        _infoItem(Icons.verified_rounded, 'KYC Status', user?['kycStatus'] == true ? 'Verified' : 'Not Verified'),
        Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            leading: Icon(Icons.card_giftcard_rounded, size: 20, color: AppTheme.primaryColor),
            title: const Text('Referral Program', style: TextStyle(color: Colors.black54, fontSize: 14)),
            trailing: const Icon(Icons.expand_more_rounded, size: 20),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(52, 0, 16, 16),
                child: Column(
                  children: [
                    _referralDetail('Referral Code', user?['referralCode'] ?? '...'),
                    const SizedBox(height: 12),
                    _referralDetail('Referral Link', 'https://ufriends.com/register?ref=${user?['referralCode'] ?? ''}'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _referralDetail(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade500, fontSize: 11, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Row(
          children: [
            Expanded(
              child: Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87),
              ),
            ),
            IconButton(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: value));
                AppToast.show(context, message: '$label copied!', type: ToastType.success);
              },
              icon: const Icon(Icons.copy_rounded, size: 16, color: Color(0xFF1E90FF)),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSettingsSection() {
    return _buildSection(
      'Account Settings',
      [
        _settingsItem(Icons.key_rounded, 'Change Password', () {}),
        _settingsItem(Icons.dialpad_rounded, 'Transaction PIN', () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const PinSettingsScreen()),
          );
        }),
        _settingsItem(Icons.notifications_active_rounded, 'Notification Settings', () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const NotificationSettingsScreen()),
          );
        }),
      ],
    );
  }

  Widget _buildSecuritySection() {
    return _buildSection(
      'Security',
      [
        _settingsItem(Icons.phonelink_lock_rounded, 'Two-Factor Auth (2FA)', () {}),
        _settingsItem(Icons.code_rounded, 'Developer API Keys', () {}),
      ],
    );
  }

  Widget _buildSection(String title, List<Widget> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.grey.shade100),
          ),
          child: Column(
            children: items,
          ),
        ),
      ],
    );
  }

  Widget _infoItem(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF1E90FF)),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(color: Colors.black54, fontSize: 14)),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _settingsItem(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, size: 20, color: const Color(0xFF1E90FF)),
      title: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right_rounded, size: 20),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    );
  }
}
