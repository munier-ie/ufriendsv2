import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/api_service.dart';
import '../../core/custom_widgets.dart';
import 'package:intl/intl.dart';
import 'pin_screen.dart';

class ReferralsScreen extends StatefulWidget {
  const ReferralsScreen({super.key});

  @override
  State<ReferralsScreen> createState() => _ReferralsScreenState();
}

class _ReferralsScreenState extends State<ReferralsScreen> {
  bool _loading = true;
  bool _withdrawing = false;
  Map<String, dynamic>? _stats;
  final _amountController = TextEditingController();
  bool _tcExpanded = false;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    setState(() => _loading = true);
    final result = await ApiService.getReferralStats();
    if (mounted) {
      setState(() {
        _loading = false;
        if (result['success']) {
          _stats = result['data'];
        } else {
          AppToast.show(context, message: result['error'] ?? 'Failed to load stats', type: ToastType.error);
        }
      });
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    AppToast.show(context, message: '$label copied to clipboard', type: ToastType.success);
  }

  Future<void> _withdraw() async {
    final balance = double.tryParse(_stats?['commissionBalance']?.toString() ?? '0') ?? 0;
    if (balance <= 0) {
      AppToast.show(context, message: 'No commission available to withdraw', type: ToastType.warning);
      return;
    }

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          onVerify: (pin) async {
            return await ApiService.withdrawReferralCommission(pin, _amountController.text);
          },
        ),
      ),
    );

    if (result != null) {
      if (!mounted) return;
      
      final bool isSuccess = result is Map ? result['success'] == true : (result == true);
      final String errorMessage = result is Map ? (result['error'] ?? 'Withdrawal failed') : 'Withdrawal failed';

      if (isSuccess) {
        AppToast.show(context, message: 'Withdrawal successful', type: ToastType.success);
        _amountController.clear();
        _fetchStats();
      } else {
        AppToast.show(context, message: errorMessage, type: ToastType.error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final referralCount = _stats?['referralCount'] ?? 0;
    final commissionBalance = double.tryParse(_stats?['commissionBalance']?.toString() ?? '0') ?? 0;
    final referralCode = _stats?['referralCode'] ?? '';
    final recentBonus = (_stats?['recentBonus'] as List?) ?? [];

    // The host used in the web app link
    final link = 'https://ufriends.com/register?referral=$referralCode';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Custom Header
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
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF1E90FF), size: 20),
                        onPressed: () => Navigator.pop(context),
                      ),
                      const Spacer(),
                      const Text(
                        'Referrals',
                        style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const Spacer(),
                      const SizedBox(width: 48),
                    ],
                  ),
                ),
              ),
            ),
            
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Earn commissions by inviting friends',
                            style: TextStyle(color: Colors.grey, fontSize: 14),
                          ),
                          const SizedBox(height: 24),
                          
                          // Stats Cards
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.grey.shade100),
                                    boxShadow: [
                                      BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Total Referrals', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('$referralCount', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                                          Icon(Icons.people, color: Colors.blue.shade300),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.grey.shade100),
                                    boxShadow: [
                                      BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))
                                    ],
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Commission', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text('₦${formatCurrency(commissionBalance)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                          Icon(Icons.account_balance_wallet, color: Colors.green.shade300),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          
                          const SizedBox(height: 32),
                          
                          // Links & Codes
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: Colors.grey.shade100),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 15, offset: const Offset(0, 4))
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Your Referral Code', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                                        child: Text(referralCode, style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.black87)),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    GestureDetector(
                                      onTap: () => _copyToClipboard(referralCode, 'Referral code'),
                                      child: Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(color: Colors.green.shade600, borderRadius: BorderRadius.circular(12)),
                                        child: const Icon(Icons.copy, color: Colors.white, size: 20),
                                      ),
                                    ),
                                  ],
                                ),
                                
                                const SizedBox(height: 24),
                                
                                const Text('Your Referral Link', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                        decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                                        child: Text(link, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.black87, fontSize: 13)),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    GestureDetector(
                                      onTap: () => _copyToClipboard(link, 'Referral link'),
                                      child: Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(color: AppTheme.primaryColor, borderRadius: BorderRadius.circular(12)),
                                        child: const Icon(Icons.copy, color: Colors.white, size: 20),
                                      ),
                                    ),
                                  ],
                                ),
                                
                                const SizedBox(height: 16),
                                const Text('Share this link or code with your friends. When they register and make purchases, you earn a commission!', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 32),
                          
                          // Withdraw
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: Colors.grey.shade100),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 15, offset: const Offset(0, 4))
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Withdraw Commission', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 16),
                                TextField(
                                  controller: _amountController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: 'Leave empty to withdraw all',
                                    filled: true,
                                    fillColor: Colors.grey.shade50,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                GradientButton(
                                  text: 'Withdraw to Wallet',
                                  loading: _withdrawing,
                                  onPressed: commissionBalance > 0 ? () => _withdraw() : () {},
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 32),
                          
                          // Recent History
                          const Text('Recent Earnings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(height: 16),
                          if (recentBonus.isEmpty)
                            const Center(
                              child: Padding(
                                padding: EdgeInsets.all(24.0),
                                child: Text('No recent referral activity', style: TextStyle(color: Colors.grey)),
                              ),
                            )
                          else
                            ...recentBonus.map((tx) {
                              final date = DateTime.tryParse(tx['date'] ?? '');
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 16.0),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(color: Colors.green.shade50, shape: BoxShape.circle),
                                      child: Icon(Icons.arrow_downward, size: 16, color: Colors.green.shade600),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(tx['description'] ?? 'Bonus', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                          if (date != null)
                                            Text(DateFormat('MMM d, yyyy').format(date), style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                        ],
                                      ),
                                    ),
                                    Text('+₦${formatCurrency(double.tryParse(tx['amount']?.toString() ?? '0') ?? 0)}', style: TextStyle(color: Colors.green.shade600, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              );
                            }).toList(),
                            
                          const SizedBox(height: 32),
                          
                          // Terms
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Theme(
                              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                              child: ExpansionTile(
                                leading: const Icon(Icons.description, color: AppTheme.primaryColor),
                                title: const Text('Referral Terms & Conditions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                onExpansionChanged: (v) => setState(() => _tcExpanded = v),
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      children: [
                                        _tcRow('1', 'Eligibility: The referral program is open to all registered and verified Ufriends users. You must maintain an active account to earn and withdraw commissions.'),
                                        _tcRow('2', 'How It Works: Share your unique referral link. When someone registers using your link and completes a qualifying transaction, you earn a commission based on the transaction type.'),
                                        _tcRow('3', 'Minimum Withdrawal: The minimum commission withdrawal amount is ₦100. Commissions below this threshold will remain in your referral wallet until the minimum is reached.'),
                                        _tcRow('4', 'Payout: Commissions are credited to your referral wallet instantly after a qualifying transaction by your referred user. You can withdraw accumulated commissions to your main wallet at any time.'),
                                        _tcRow('5', 'Self-Referral Prohibition: Creating multiple accounts to refer yourself, or using your own referral link in any way, is strictly prohibited and will result in account suspension and commission forfeiture.'),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          
                          const SizedBox(height: 40),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _tcRow(String num, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(color: AppTheme.primaryColor.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Center(child: Text(num, style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold, fontSize: 10))),
          ),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: TextStyle(color: Colors.grey.shade700, fontSize: 12))),
        ],
      ),
    );
  }
}
