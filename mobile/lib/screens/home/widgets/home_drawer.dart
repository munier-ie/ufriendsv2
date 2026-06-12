import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/app_theme.dart';
import '../../../core/constants.dart';
import '../data_screen.dart';
import '../airtime_screen.dart';
import '../airtime_to_cash_screen.dart';
import '../recharge_cards_screen.dart';
import '../cable_tv_screen.dart';
import '../electricity_screen.dart';
import '../data_pins_screen.dart';
import '../exam_pins_screen.dart';
import '../nin_slip_screen.dart';
import '../bvn_slip_screen.dart';
import '../cac_registration_screen.dart';
import '../nin_services_screen.dart';
import '../bvn_services_screen.dart';
import '../upgrade_screen.dart';
import '../academy_screen.dart';
import '../pricing_screen.dart';
import '../support_screen.dart';
import '../referrals_screen.dart';

class HomeDrawer extends StatelessWidget {
  final Map<String, dynamic>? userProfile;
  final ValueChanged<int> onTabSelected;
  final VoidCallback onLogout;

  const HomeDrawer({
    super.key,
    required this.userProfile,
    required this.onTabSelected,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final double drawerWidth = MediaQuery.of(context).size.width * 0.75;
    return SizedBox(
      width: drawerWidth,
      child: Drawer(
        backgroundColor: context.cardColor,
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
              decoration: BoxDecoration(
                color: context.cardColor,
                border: Border(bottom: BorderSide(color: context.dividerColor, width: 1)),
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
                    userProfile != null ? (userProfile!['name'] ?? '${userProfile!['firstName']} ${userProfile!['lastName']}') : 'Loading...',
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.bold, 
                      color: context.textPrimary, 
                      fontSize: 18,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    userProfile?['email'] ?? '...',
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: context.textSecondary, 
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
                  _drawerItem(context, Icons.workspace_premium_rounded, 'Upgrade Account', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const UpgradeScreen()));
                  }),
                  _drawerItem(context, Icons.dashboard_outlined, 'Dashboard', true),
                  _drawerItem(context, Icons.grid_view_rounded, 'Services', false, onTap: () {
                    Navigator.pop(context);
                    onTabSelected(2);
                  }),
                  _drawerItem(context, Icons.swap_vert_rounded, 'Data', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const DataScreen()));
                  }),
                  _drawerItem(context, Icons.phone_android_rounded, 'Airtime', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeScreen()));
                  }),
                  _drawerItem(context, Icons.live_tv_rounded, 'Cable TV', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const CableTvScreen()));
                  }),
                  _drawerItem(context, Icons.lightbulb_outline_rounded, 'Electricity', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ElectricityScreen()));
                  }),
                  _drawerItem(context, Icons.document_scanner_outlined, 'NIN Slip', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const NinSlipScreen()));
                  }),
                  _drawerItem(context, Icons.account_balance_rounded, 'BVN Slip', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnSlipScreen()));
                  }),
                  _drawerItem(context, Icons.shopping_bag_outlined, 'Exam PINs', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ExamPinsScreen()));
                  }),
                  _drawerItem(context, Icons.swap_horizontal_circle_outlined, 'Airtime2cash', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeToCashScreen()));
                  }),
                  _drawerItem(context, Icons.edit_note_rounded, 'NIN Services', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const NinServicesScreen()));
                  }),
                  _drawerItem(context, Icons.manage_accounts_rounded, 'BVN Services', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnServicesScreen()));
                  }),
                  _drawerItem(context, Icons.business_center_rounded, 'CAC Reg.', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const CacRegistrationScreen()));
                  }),
                  _drawerItem(context, Icons.print_rounded, 'Recharge Cards', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const RechargeCardsScreen()));
                  }),
                  _drawerItem(context, Icons.emoji_emotions_outlined, 'Smile Data', false),

                  _drawerItem(context, Icons.tag_rounded, 'Data PINs', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const DataPinsScreen()));
                  }),
                  _drawerItem(context, Icons.history_rounded, 'Transactions', false, onTap: () {
                    Navigator.pop(context);
                    onTabSelected(3);
                  }),
                  _drawerItem(context, Icons.price_change_outlined, 'Pricing', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const PricingScreen()));
                  }),
                  _drawerItem(context, Icons.message_outlined, 'Bulk SMS', false),
                  _drawerItem(context, Icons.people_outline, 'Referrals', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ReferralsScreen()));
                  }),
                  _drawerItem(context, Icons.school_outlined, 'Academy', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AcademyScreen()));
                  }),

                  _drawerItem(context, Icons.rocket_launch_outlined, 'Own a VTU App', false, onTap: () async {
                    Navigator.pop(context);
                    final url = Uri.parse('${AppConstants.baseServerUrl.replaceAll(':3000', ':5173')}/reseller');
                    await launchUrl(url, mode: LaunchMode.externalApplication);
                  }),
                  _drawerItem(context, Icons.help_outline_rounded, 'Support Center', false, onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const SupportScreen()));
                  }),
                  _drawerItem(context, Icons.person_outline_rounded, 'Profile', false, onTap: () {
                    Navigator.pop(context);
                    onTabSelected(4);
                  }),
                ],
              ),
            ),
            
            // Fixed Bottom Logout Button
            Padding(
              padding: const EdgeInsets.all(20),
              child: GestureDetector(
                onTap: onLogout,
                child: Container(
                  width: double.infinity,
                  height: 50,
                  decoration: BoxDecoration(
                    color: context.subtleBg,
                    borderRadius: BorderRadius.circular(25),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    'Sign Out',
                    style: TextStyle(
                      color: context.textPrimary,
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

  Widget _drawerItem(BuildContext context, IconData icon, String title, bool selected, {Color? color, VoidCallback? onTap}) {
    const Color activeColor = Color(0xFF1E90FF); // DodgerBlue
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: selected ? activeColor.withValues(alpha: 0.08) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: ListTile(
          visualDensity: const VisualDensity(vertical: -2),
          leading: Icon(
            icon, 
            color: color ?? (selected ? activeColor : context.iconDefault),
            size: 22,
          ),
          title: Text(
            title,
            style: TextStyle(
              color: color ?? (selected ? activeColor : context.textPrimary),
              fontWeight: selected ? FontWeight.bold : FontWeight.w500,
              fontSize: 14,
            ),
          ),
          selected: selected,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          onTap: onTap ?? () {},
        ),
      ),
    );
  }
}
