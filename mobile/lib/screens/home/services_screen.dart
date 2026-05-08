import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import 'airtime_screen.dart';
import 'data_screen.dart';

class ServicesScreen extends StatefulWidget {
  final Future<void> Function() onRefresh;
  const ServicesScreen({super.key, required this.onRefresh});

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
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: widget.onRefresh,
        color: AppTheme.primaryColor,
        child: CustomScrollView(
          slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 10),
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
                  const Text(
                    'Ufriends Services',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: Colors.black87,
                      letterSpacing: -1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Choose a service to continue',
                    style: TextStyle(
                      color: Colors.grey.shade600,
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
                childAspectRatio: 0.82,
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
          const SliverToBoxAdapter(child: SizedBox(height: 140)),
        ],
        ),
      ),
    );
  }

  Widget _buildServiceCard(Map<String, dynamic> cat, bool isEven) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        gradient: LinearGradient(
          colors: [
            Colors.white,
            cat['color'].withValues(alpha: 0.05),
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
        border: Border.all(color: Colors.grey.shade100, width: 1.5),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (cat['id'] == 'airtime') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AirtimeScreen()));
            } else if (cat['id'] == 'data') {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const DataScreen()));
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
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
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
                    color: Colors.grey.shade600,
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
