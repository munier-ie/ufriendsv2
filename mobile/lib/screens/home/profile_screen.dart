import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import 'notification_settings_screen.dart';
import 'pin_settings_screen.dart';
import 'change_password_screen.dart';
import 'two_fa_screen.dart';
import 'package:provider/provider.dart';
import '../../theme_state.dart';
import 'api_keys_screen.dart';
import 'kyc_screen.dart';
import '../../core/biometric_service.dart';
import '../../core/auth_service.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic>? userProfile;
  final Future<void> Function() onRefresh;

  const ProfileScreen({super.key, this.userProfile, required this.onRefresh});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _biometricsEnabled = false;
  String _biometricsBehavior = 'always';
  final TextEditingController _timeoutController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadBiometricsPreference();
  }

  @override
  void dispose() {
    _timeoutController.dispose();
    super.dispose();
  }

  Future<void> _loadBiometricsPreference() async {
    bool enabled = await BiometricService.isBiometricsEnabled();
    String behavior = await BiometricService.getBehavior();
    int timeout = await BiometricService.getTimeoutMinutes();
    if (mounted) {
      setState(() {
        _biometricsEnabled = enabled;
        _biometricsBehavior = behavior;
        _timeoutController.text = timeout.toString();
      });
    }
  }

  Future<void> _toggleBiometrics(bool value) async {
    if (value) {
      bool canAuth = await BiometricService.canAuthenticate();
      if (!canAuth) {
        if (mounted) {
          AppToast.show(
            context,
            message: 'Biometric authentication is not supported or not enrolled on this device.',
            type: ToastType.error,
          );
        }
        return;
      }
      
      bool verified = await BiometricService.authenticate();
      if (verified) {
        await BiometricService.setBiometricsEnabled(true);
        if (mounted) {
          setState(() {
            _biometricsEnabled = true;
          });
          AppToast.show(
            context,
            message: 'Biometric authentication enabled successfully.',
            type: ToastType.success,
          );
        }
      } else {
        if (mounted) {
          AppToast.show(
            context,
            message: 'Verification failed. Biometric authentication was not enabled.',
            type: ToastType.error,
          );
        }
      }
    } else {
      await BiometricService.setBiometricsEnabled(false);
      if (mounted) {
        setState(() {
          _biometricsEnabled = false;
        });
        AppToast.show(
          context,
          message: 'Biometric authentication disabled.',
          type: ToastType.success,
        );
      }
    }
  }

  Future<void> _updateBiometricBehavior(String? behavior) async {
    if (behavior == null) return;
    await BiometricService.setBehavior(behavior);
    if (mounted) {
      setState(() {
        _biometricsBehavior = behavior;
      });
    }
  }

  Future<void> _updateBiometricTimeout(String val) async {
    final int? minutes = int.tryParse(val);
    if (minutes != null && minutes > 0) {
      await BiometricService.setTimeoutMinutes(minutes);
      if (mounted) {
        setState(() {});
      }
    }
  }

  String _getBehaviorLabel(String behavior) {
    switch (behavior) {
      case 'always':
        return 'Always';
      case 'cold_start':
        return 'Cold Start Only';
      case 'timeout':
        return 'After Timeout';
      default:
        return 'Always';
    }
  }

  void _showBehaviorDrawer() {
    String tempBehavior = _biometricsBehavior;
    final tempTimeoutController = TextEditingController(text: _timeoutController.text);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
              ),
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
                  const SizedBox(height: 20),
                  Text(
                    'Lock Behavior',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Choose when biometric lock activates',
                    style: TextStyle(fontSize: 13, color: context.textMuted),
                  ),
                  const SizedBox(height: 20),
                  _behaviorOption(
                    icon: Icons.lock_rounded,
                    title: 'Always',
                    subtitle: 'Lock on every open & resume',
                    value: 'always',
                    groupValue: tempBehavior,
                    onChanged: (val) {
                      setSheetState(() => tempBehavior = val);
                    },
                  ),
                  const SizedBox(height: 8),
                  _behaviorOption(
                    icon: Icons.power_settings_new_rounded,
                    title: 'Cold Start Only',
                    subtitle: 'Lock only when app is freshly opened',
                    value: 'cold_start',
                    groupValue: tempBehavior,
                    onChanged: (val) {
                      setSheetState(() => tempBehavior = val);
                    },
                  ),
                  const SizedBox(height: 8),
                  _behaviorOption(
                    icon: Icons.timer_rounded,
                    title: 'After Timeout',
                    subtitle: 'Lock after a custom idle duration',
                    value: 'timeout',
                    groupValue: tempBehavior,
                    onChanged: (val) {
                      setSheetState(() => tempBehavior = val);
                    },
                  ),
                  if (tempBehavior == 'timeout') ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: tempTimeoutController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: false, signed: false),
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                      ],
                      style: TextStyle(fontWeight: FontWeight.normal, color: context.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Timeout (minutes)',
                        labelStyle: TextStyle(color: context.textMuted, fontWeight: FontWeight.normal),
                        hintText: 'e.g. 5',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: context.borderColor),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: context.borderColor),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: AppTheme.secondaryColor, width: 2),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () async {
                        await _updateBiometricBehavior(tempBehavior);
                        if (tempBehavior == 'timeout') {
                          await _updateBiometricTimeout(tempTimeoutController.text);
                          _timeoutController.text = tempTimeoutController.text;
                        }
                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.secondaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text('Save', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
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

  Widget _behaviorOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required String value,
    required String groupValue,
    required ValueChanged<String> onChanged,
  }) {
    final isSelected = value == groupValue;
    return InkWell(
      onTap: () => onChanged(value),
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.secondaryColor.withValues(alpha: 0.08) : context.subtleBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppTheme.secondaryColor : context.borderColor,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 22, color: isSelected ? AppTheme.secondaryColor : context.iconMuted),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? AppTheme.secondaryColor : context.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: context.textMuted),
                  ),
                ],
              ),
            ),
            Icon(
              isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
              color: isSelected ? AppTheme.secondaryColor : context.iconMuted,
              size: 22,
            ),
          ],
        ),
      ),
    );
  }

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
          const SizedBox(height: 24),
          _buildLogoutSection(),
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
        gradient: context.cardGradient,
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
        InkWell(
          onTap: (user?['kycStatus'] == true || user?['kycStatus'] == 'verified') ? null : () async {
            final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const KycScreen()));
            if (result == true) {
              widget.onRefresh();
            }
          },
          child: _infoItem(
            Icons.verified_rounded, 
            'KYC Status', 
            (user?['kycStatus'] == true || user?['kycStatus'] == 'verified') ? 'Verified' : 'Not Verified (Tap)',
          ),
        ),
        Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            leading: Icon(Icons.card_giftcard_rounded, size: 20, color: AppTheme.primaryColor),
            title: Text('Referral Program', style: TextStyle(color: context.textSecondary, fontSize: 14)),
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
        Text(label, style: TextStyle(color: context.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Row(
          children: [
            Expanded(
              child: Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: context.textPrimary),
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
        _settingsItem(Icons.key_rounded, 'Change Password', () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen()));
        }),
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
        _settingsItem(
          Icons.fingerprint_rounded,
          'Biometric Authentication',
          () => _toggleBiometrics(!_biometricsEnabled),
          trailing: Switch(
            value: _biometricsEnabled,
            onChanged: _toggleBiometrics,
            activeThumbColor: AppTheme.secondaryColor,
          ),
        ),
        if (_biometricsEnabled) ...[
          _settingsItem(
            Icons.tune_rounded,
            'Lock Behavior: ${_getBehaviorLabel(_biometricsBehavior)}',
            () => _showBehaviorDrawer(),
            trailing: const Icon(Icons.chevron_right_rounded, size: 20),
          ),
        ],
        Consumer<ThemeState>(
          builder: (context, themeState, _) {
            return _settingsItem(
              themeState.isDarkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
              'Dark Mode',
              () => themeState.toggleTheme(),
              trailing: Switch(
                value: themeState.isDarkMode,
                onChanged: (val) => themeState.toggleTheme(),
                activeThumbColor: AppTheme.secondaryColor,
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildSecuritySection() {
    return _buildSection(
      'Security',
      [
        _settingsItem(Icons.phonelink_lock_rounded, 'Two-Factor Auth (2FA)', () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const TwoFaScreen()));
        }),
        _settingsItem(Icons.code_rounded, 'Developer API Keys', () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const ApiKeysScreen()));
        }),
      ],
    );
  }

  Widget _buildSection(String title, List<Widget> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: context.textPrimary),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: context.dividerColor),
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
          Text(label, style: TextStyle(color: context.textSecondary, fontSize: 14)),
          const Spacer(),
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: context.textPrimary)),
        ],
      ),
    );
  }

  Widget _settingsItem(IconData icon, String label, VoidCallback onTap, {Widget? trailing}) {
    return ListTile(
      leading: Icon(icon, size: 20, color: const Color(0xFF1E90FF)),
      title: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
      trailing: trailing ?? const Icon(Icons.chevron_right_rounded, size: 20),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    );
  }

  Widget _buildLogoutSection() {
    return Column(
      children: [
        InkWell(
          onTap: () async {
            _showLogoutConfirmation();
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 16),
            width: double.infinity,
            decoration: BoxDecoration(
              color: context.isDark ? const Color(0xFF2D1A1A) : const Color(0xFFFEE2E2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: context.isDark ? Colors.red.shade900 : Colors.red.shade200,
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.logout_rounded,
                  color: context.isDark ? Colors.red.shade400 : Colors.red.shade700,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Sign Out',
                  style: TextStyle(
                    color: context.isDark ? Colors.red.shade400 : Colors.red.shade700,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showLogoutConfirmation() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
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
              Text(
                'Sign Out',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: context.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Are you sure you want to sign out of your account?',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: context.textSecondary,
                ),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(sheetContext),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.shade600,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () async {
                        Navigator.pop(sheetContext); // Close sheet
                        await AuthService.logout();
                        if (mounted) {
                          Navigator.of(context).pushAndRemoveUntil(
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                            (route) => false,
                          );
                        }
                      },
                      child: const Text('Sign Out'),
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
}
