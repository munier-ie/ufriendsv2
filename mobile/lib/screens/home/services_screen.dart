import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import 'airtime_screen.dart';
import 'data_screen.dart';
import 'airtime_to_cash_screen.dart';
import 'recharge_cards_screen.dart';
import 'cable_tv_screen.dart';
import 'electricity_screen.dart';
import 'data_pins_screen.dart';
import 'exam_pins_screen.dart';
import 'nin_slip_screen.dart';
import 'bvn_slip_screen.dart';
import 'cac_registration_screen.dart';
import 'nin_services_screen.dart';
import 'bvn_services_screen.dart';




class ServicesScreen extends StatefulWidget {
  final Future<void> Function() onRefresh;
  final double topPadding;
  final double bottomPadding;

  const ServicesScreen({
    super.key,
    required this.onRefresh,
    this.topPadding = 24.0,
    this.bottomPadding = 24.0,
  });

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final List<Map<String, dynamic>> _categories = [
    {
      'id': 'airtime',
      'name': 'Airtime',
      'icon': Icons.phone_android_rounded,
      'color': const Color(0xFF1E90FF), // DodgerBlue
      'desc': 'Top up your mobile credit instantly.'
    },
    {
      'id': 'data',
      'name': 'Data',
      'icon': Icons.wifi_rounded,
      'color': const Color(0xFF004687), // Primary Deep Blue
      'desc': 'Get affordable data plans for all networks.'
    },
    {
      'id': 'cable',
      'name': 'Cable TV',
      'icon': Icons.tv_rounded,
      'color': const Color(0xFF1E90FF),
      'desc': 'Renew your DSTV, GOTV & Startimes.'
    },
    {
      'id': 'electricity',
      'name': 'Electricity',
      'icon': Icons.bolt_rounded,
      'color': const Color(0xFF004687),
      'desc': 'Pay your electricity bills without hassle.'
    },
    {
      'id': 'data_pin',
      'name': 'Data Pins',
      'icon': Icons.tag_rounded,
      'color': const Color(0xFF1E90FF),
      'desc': 'Purchase data recharge pins for later use.'
    },
    {
      'id': 'exam',
      'name': 'Exam Pins',
      'icon': Icons.school_rounded,
      'color': const Color(0xFF004687),
      'desc': 'Get WAEC, NECO & JAMB result checker pins.'
    },
    {
      'id': 'airtime2cash',
      'name': 'Airtime2cash',
      'icon': Icons.swap_horizontal_circle_outlined,
      'color': const Color(0xFF1E90FF),
      'desc': 'Convert your airtime to wallet balance.'
    },
    {
      'id': 'recharge_cards',
      'name': 'Recharge Cards',
      'icon': Icons.print_rounded,
      'color': const Color(0xFF004687),
      'desc': 'Print recharge cards for various networks.'
    },
    {
      'id': 'nin_slip',
      'name': 'NIN Slip',
      'icon': Icons.fingerprint_rounded,
      'color': const Color(0xFF1E90FF),
      'desc': 'Verify NIN & generate downloadable identity slip.'
    },
    {
      'id': 'bvn_slip',
      'name': 'BVN Slip',
      'icon': Icons.account_balance_rounded,
      'color': const Color(0xFF004687),
      'desc': 'Verify BVN & generate premium verification slip.'
    },
    {
      'id': 'cac',
      'name': 'CAC Reg.',
      'icon': Icons.business_center_rounded,
      'color': const Color(0xFF1E90FF),
      'desc': 'Register your business or company with CAC.'
    },
    {
      'id': 'nin_services',
      'name': 'NIN Services',
      'icon': Icons.edit_document,
      'color': const Color(0xFF004687),
      'desc': 'NIN modification, validation & more.'
    },
    {
      'id': 'bvn_services',
      'name': 'BVN Services',
      'icon': Icons.manage_accounts_rounded,
      'color': const Color(0xFF1E90FF),
      'desc': 'BVN modification, retrieval & more.'
    },
  ];



  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      triggerMode: RefreshIndicatorTriggerMode.anywhere,
      edgeOffset: widget.topPadding,
      onRefresh: widget.onRefresh,
      color: AppTheme.primaryColor,
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(24, widget.topPadding, 24, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.secondaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'FAST & SECURE',
                      style: TextStyle(
                        color: AppTheme.secondaryColor,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Ufriends Services',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: context.textPrimary,
                      letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Choose a service to continue',
                    style: TextStyle(
                      color: context.textSecondary,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(24),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 20,
                mainAxisSpacing: 20,
                childAspectRatio: 0.75,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final cat = _categories[index];
                  bool isEven = index % 2 == 0;
                  return _buildServiceCard(cat, isEven);
                },
                childCount: _categories.length,
              ),
            ),
          ),
          SliverPadding(padding: EdgeInsets.only(bottom: widget.bottomPadding)),
        ],
      ),
    );
  }

  Widget _buildServiceCard(Map<String, dynamic> cat, bool isEven) {
    return Container(
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(32),
        gradient: LinearGradient(
          colors: [
            context.cardColor,
            cat['color'].withValues(alpha: context.isDark ? 0.15 : 0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
        border: Border.all(color: context.dividerColor, width: 1.5),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (cat['id'] == 'airtime') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeScreen()));
            } else if (cat['id'] == 'data') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const DataScreen()));
            } else if (cat['id'] == 'cable') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CableTvScreen()));
            } else if (cat['id'] == 'electricity') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ElectricityScreen()));
            } else if (cat['id'] == 'data_pin') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const DataPinsScreen()));
            } else if (cat['id'] == 'exam') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ExamPinsScreen()));
            } else if (cat['id'] == 'airtime2cash') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeToCashScreen()));
            } else if (cat['id'] == 'recharge_cards') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const RechargeCardsScreen()));
            } else if (cat['id'] == 'nin_slip') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NinSlipScreen()));
            } else if (cat['id'] == 'bvn_slip') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnSlipScreen()));
            } else if (cat['id'] == 'cac') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CacRegistrationScreen()));
            } else if (cat['id'] == 'nin_services') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NinServicesScreen()));
            } else if (cat['id'] == 'bvn_services') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const BvnServicesScreen()));
            } else {
              AppToast.show(context, message: 'Coming soon: ${cat['name']}', type: ToastType.warning);
            }



          },
          borderRadius: BorderRadius.circular(32),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: cat['color'],
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: cat['color'].withValues(alpha: 0.4),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Icon(cat['icon'], color: Colors.white, size: 28),
                ),
                const Spacer(),
                Text(
                  cat['name'],
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: context.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  cat['desc'],
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11,
                    color: context.textSecondary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
