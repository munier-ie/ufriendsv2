import 'package:flutter/material.dart';
import '../../../core/app_theme.dart';
import '../data_screen.dart';
import '../airtime_screen.dart';
import '../airtime_to_cash_screen.dart';
import '../recharge_cards_screen.dart';

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
                    userProfile != null ? (userProfile!['name'] ?? '${userProfile!['firstName']} ${userProfile!['lastName']}') : 'Loading...',
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
                    userProfile?['email'] ?? '...',
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
                    onTabSelected(2);
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
                  _drawerItem(Icons.history_rounded, 'Transactions', false, onTap: () {
                    Navigator.pop(context);
                    onTabSelected(3);
                  }),
                  _drawerItem(Icons.price_change_outlined, 'Pricing', false),
                  _drawerItem(Icons.message_outlined, 'Bulk SMS', false),
                  _drawerItem(Icons.people_outline, 'Referrals', false),
                  _drawerItem(Icons.school_outlined, 'Academy', false),

                  _drawerItem(Icons.business_center_outlined, 'Become a Reseller', false),
                  _drawerItem(Icons.help_outline_rounded, 'Support Center', false),
                  _drawerItem(Icons.person_outline_rounded, 'Profile', false, onTap: () {
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
}
