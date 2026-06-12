import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

class UpgradeScreen extends StatefulWidget {
  const UpgradeScreen({super.key});

  @override
  State<UpgradeScreen> createState() => _UpgradeScreenState();
}

class _UpgradeScreenState extends State<UpgradeScreen> {
  bool _loading = true;
  final bool _upgrading = false;
  Map<String, dynamic>? _user;
  List<dynamic> _tiers = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    
    final responses = await Future.wait([
      ApiService.getProfile(),
      ApiService.fetchUpgradePlans(),
    ]);

    final userRes = responses[0];
    final planRes = responses[1];

    if (mounted) {
      setState(() {
        if (userRes['success'] == true) _user = userRes['user'];
        if (planRes['success'] == true) {
          _tiers = planRes['data']['plans'] ?? [];
        }
        _loading = false;
      });
    }
  }

  Future<void> _handleUpgrade(dynamic tier) async {
    final targetType = tier['type'];
    final typeName = tier['name'];
    final price = tier['price'];

    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Upgrade to $typeName?'),
        content: Text('A one-time fee of ₦${price.toString()} will be deducted from your wallet to upgrade to the $typeName plan.'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Continue', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          title: 'Confirm Upgrade',
          onVerify: (pin) async {
            return await ApiService.upgradeAccount(targetType);
          },
        ),
      ),
    );

    if (result != null && mounted) {
      if (result['success'] == true) {
        AppToast.show(context, message: result['message'] ?? 'Account upgraded successfully!', type: ToastType.success);
        
        // Update local user
        if (_user != null) {
          _user!['type'] = targetType;
          final prefs = await SharedPreferences.getInstance();
          final userStr = prefs.getString('user');
          if (userStr != null) {
            try {
              final Map<String, dynamic> localUser = jsonDecode(userStr);
              localUser['type'] = targetType;
              await prefs.setString('user', jsonEncode(localUser));
            } catch (_) {}
          }
        }
        _loadData();
      } else {
        AppToast.show(context, message: result['error'] ?? 'Upgrade failed', type: ToastType.error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Upgrade Account', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black87,
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(),
    );
  }

  Widget _buildBody() {
    final balance = _user != null ? double.tryParse(_user!['balance']?.toString() ?? '0') ?? 0 : 0.0;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.amber.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.workspace_premium_rounded, size: 48, color: Colors.amber.shade700),
          ),
          const SizedBox(height: 16),
          const Text('Unlock Premium Features', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87)),
          const SizedBox(height: 8),
          const Text('Upgrade your account tier to enjoy exclusive discounts on all services.', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: Colors.black54)),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text('Current Balance: ₦${balance.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ),
          const SizedBox(height: 32),
          
          if (_tiers.isEmpty)
             const Text('No upgrade plans available at the moment.')
          else
             ..._tiers.map((tier) => _buildTierCard(tier)),
        ],
      ),
    );
  }

  Widget _buildTierCard(dynamic tier) {
    final currentType = _user?['type'] ?? 1;
    final isCurrent = currentType == tier['type'];
    final isLower = currentType > tier['type'];
    final canUpgrade = !isCurrent && !isLower;

    Color badgeColor;
    Color iconBgColor;
    Color buttonColor;
    
    if (tier['type'] == 1) {
      badgeColor = Colors.grey.shade600;
      iconBgColor = Colors.grey.shade100;
      buttonColor = AppTheme.primaryColor;
    } else if (tier['type'] == 2) {
      badgeColor = Colors.blue.shade600;
      iconBgColor = Colors.blue.shade50;
      buttonColor = Colors.blue.shade700;
    } else {
      badgeColor = Colors.amber.shade700;
      iconBgColor = Colors.amber.shade50;
      buttonColor = Colors.amber.shade600;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isCurrent ? badgeColor : Colors.grey.shade200,
          width: isCurrent ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isCurrent ? 0.05 : 0.02),
            blurRadius: 15,
            offset: const Offset(0, 8),
          )
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          if (isCurrent)
            Positioned(
              top: -12,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  decoration: BoxDecoration(
                    color: badgeColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('CURRENT PLAN', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                ),
              ),
            ),
            
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: iconBgColor,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(Icons.workspace_premium_rounded, color: badgeColor, size: 28),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(tier['name'], style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(tier['price'] == 0 ? 'Free' : '₦${tier['price']}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.black87)),
                              if (tier['price'] > 0)
                                const Text(' / one-time', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                
                if (tier['features'] != null && tier['features'] is List)
                  ...((tier['features'] as List).map((f) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Colors.green, size: 20),
                        const SizedBox(width: 12),
                        Expanded(child: Text(f.toString(), style: TextStyle(color: Colors.grey.shade700))),
                      ],
                    ),
                  ))),
                
                const SizedBox(height: 24),
                
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: canUpgrade && !_upgrading ? () => _handleUpgrade(tier) : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isCurrent ? Colors.grey.shade200 : (isLower ? Colors.grey.shade100 : buttonColor),
                      foregroundColor: (isCurrent || isLower) ? Colors.grey.shade500 : Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: canUpgrade ? 2 : 0,
                    ),
                    child: Text(
                      isCurrent ? 'Active Plan' : (isLower ? 'Unlocked' : 'Upgrade to ${tier['name']}'),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
