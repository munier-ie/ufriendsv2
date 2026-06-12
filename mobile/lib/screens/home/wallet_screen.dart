import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/skeleton_loader.dart';
import '../../core/api_service.dart';
import '../../core/custom_widgets.dart';
import 'kyc_screen.dart';

class WalletScreen extends StatefulWidget {
  final Map<String, dynamic>? userProfile;
  final Function() onRefresh;

  const WalletScreen({super.key, this.userProfile, required this.onRefresh});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  List<dynamic> _accounts = [];
  bool _isLoading = true;
  bool _hideWallet = true;

  @override
  void initState() {
    super.initState();
    _fetchAccounts();
  }

  Future<void> _fetchAccounts() async {
    try {
      final res = await ApiService.getVirtualAccounts();
      if (res['success']) {
        setState(() {
          _accounts = res['accounts'] ?? [];
        });
      }
    } catch (e) {
      debugPrint('Error fetching accounts: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    AppToast.show(context, message: 'Copied to clipboard', type: ToastType.success);
  }

  Future<void> _goToKycScreen() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const KycScreen()),
    );
    if (result == true) {
      await _fetchAccounts();
      await widget.onRefresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        await _fetchAccounts();
        await widget.onRefresh();
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildBalanceCard(),
          const SizedBox(height: 24),
          _buildVirtualAccountsSection(),
          const SizedBox(height: 24),
          _buildFundingInfo(),
          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildBalanceCard() {
    final balance = widget.userProfile?['wallet'] ?? 0;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: context.cardGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: context.isDark ? Colors.black.withValues(alpha: 0.4) : AppTheme.primaryColor.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
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
              IconButton(
                icon: Icon(
                  _hideWallet ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                  color: Colors.white70,
                  size: 20,
                ),
                onPressed: () {
                  setState(() {
                    _hideWallet = !_hideWallet;
                  });
                },
                constraints: const BoxConstraints(),
                padding: EdgeInsets.zero,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _hideWallet ? '₦***' : '₦${formatCurrency(balance.toDouble())}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _actionButton(Icons.outbound_rounded, 'Withdraw', () {
                AppToast.show(context, message: "Withdrawal's coming soon", type: ToastType.success);
              }),
            ],
          ),
        ],
      ),
    );
  }

  Widget _actionButton(IconData icon, String label, VoidCallback onTap) {
    return Expanded(
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVirtualAccountsSection() {
    if (_isLoading) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Skeleton(width: 150, height: 24),
          const SizedBox(height: 12),
          const Skeleton(height: 100),
          const SizedBox(height: 12),
          const Skeleton(height: 100),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Virtual Accounts',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.textPrimary),
        ),
        const SizedBox(height: 12),
        if (_accounts.isEmpty)
          _buildNoAccountCard()
        else
          ..._accounts.map((acc) => _buildAccountCard(acc)),
      ],
    );
  }

  Widget _buildNoAccountCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(
        children: [
          const Icon(Icons.account_balance_rounded, color: Colors.blue, size: 40),
          const SizedBox(height: 12),
          const Text(
            'No Virtual Account Found',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'Verify your BVN or NIN to generate a dedicated virtual account for funding your wallet.',
            textAlign: TextAlign.center,
            style: TextStyle(color: context.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _goToKycScreen,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E90FF),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Verify & Generate Account'),
          ),
        ],
      ),
    );
  }

  Widget _buildAccountCard(Map<String, dynamic> acc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.dividerColor),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                acc['bankName'] ?? 'Bank',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const Icon(Icons.copy_rounded, size: 18, color: Colors.grey),
            ],
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () => _copyToClipboard(acc['accountNumber'] ?? ''),
            child: Text(
              acc['accountNumber'] ?? '0000000000',
              style: TextStyle(
                fontSize: 24, 
                fontWeight: FontWeight.w900, 
                letterSpacing: 2,
                color: AppTheme.primaryColor,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            acc['accountName'] ?? 'Ufriends User',
            style: TextStyle(color: context.textSecondary, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildFundingInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.subtleBg,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '💡 How to Fund',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: context.textPrimary),
          ),
          SizedBox(height: 8),
          Text(
            '1. Transfer any amount to your virtual account number.\n'
            '2. Your wallet will be credited automatically.\n'
            '3. No fees, instant confirmation.',
            style: TextStyle(color: context.textSecondary, fontSize: 12, height: 1.5),
          ),
        ],
      ),
    );
  }
}
