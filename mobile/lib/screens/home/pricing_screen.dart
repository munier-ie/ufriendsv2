import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/api_service.dart';
import '../../core/custom_widgets.dart';
import 'upgrade_screen.dart';

class PricingScreen extends StatefulWidget {
  const PricingScreen({super.key});

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen> {
  bool _loading = true;
  List<dynamic> _services = [];
  String _searchQuery = '';
  String _activeCategory = 'all';

  final List<Map<String, String>> _categories = [
    {'id': 'all', 'label': 'All Services'},
    {'id': 'airtime', 'label': 'Airtime'},
    {'id': 'data', 'label': 'Data'},
    {'id': 'cable', 'label': 'Cable TV'},
    {'id': 'electricity', 'label': 'Electricity'},
    {'id': 'exam', 'label': 'Exam PINs'},
    {'id': 'data_pin', 'label': 'Data PINs'},
    {'id': 'manual', 'label': 'Manual Services'},
    {'id': 'gov', 'label': 'Gov Services'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchPricing();
  }

  Future<void> _fetchPricing() async {
    final result = await ApiService.getPricingServices();
    if (mounted) {
      setState(() {
        _loading = false;
        if (result['success']) {
          _services = result['services'];
        }
      });
    }
  }

  String _formatPrice(Map<String, dynamic> service, dynamic price) {
    if (service['type'] == 'airtime_cash') return '$price%';
    final numPrice = (price is num) ? price.toDouble() : double.tryParse(price.toString()) ?? 0.0;
    if (numPrice <= 0) return 'Variable';
    return '₦${formatCurrency(numPrice)}';
  }

  @override
  Widget build(BuildContext context) {
    final filteredServices = _services.where((s) {
      final name = s['name']?.toString().toLowerCase() ?? '';
      final type = s['type']?.toString().toLowerCase() ?? '';
      final matchesSearch = name.contains(_searchQuery.toLowerCase()) || type.contains(_searchQuery.toLowerCase());
      final matchesCategory = _activeCategory == 'all' || type == _activeCategory;
      return matchesSearch && matchesCategory;
    }).toList();

    return Scaffold(
      backgroundColor: context.cardColor,
      body: SafeArea(
        child: Column(
          children: [
            // Custom Header
            Container(
              margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              height: 56,
              decoration: BoxDecoration(
                color: context.glassBg,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: context.glassBorder, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: context.glassShadow,
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
                      Text(
                        'Service Pricing',
                        style: TextStyle(color: context.textPrimary, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const Spacer(),
                      const SizedBox(width: 48),
                    ],
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 16),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: 'Search network or service...',
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  filled: true,
                  fillColor: context.subtleBg,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Categories
            SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _activeCategory == cat['id'];
                  return GestureDetector(
                    onTap: () => setState(() => _activeCategory = cat['id']!),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.primaryColor : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                )
                              ]
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        cat['label']!,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.grey.shade600,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 16),

            // Upgrade Banner
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: GestureDetector(
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const UpgradeScreen()));
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.1)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.info_outline, color: AppTheme.primaryColor, size: 24),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Want cheaper rates?',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            Text(
                              'Upgrade to Agent or Vendor tier.',
                              style: TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.primaryColor),
                    ],
                  ),
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Table Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  const Expanded(flex: 3, child: Text('Service', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey))),
                  Expanded(flex: 2, child: Row(children: [const Icon(Icons.local_offer, size: 12, color: Colors.grey), const SizedBox(width: 4), const Text('Regular', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey))])),
                  Expanded(flex: 2, child: Row(children: [const Icon(Icons.shield, size: 12, color: Colors.blue), const SizedBox(width: 4), const Text('Agent', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue))])),
                  Expanded(flex: 2, child: Row(children: [const Icon(Icons.star, size: 12, color: Colors.purple), const SizedBox(width: 4), const Text('Vendor', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.purple))])),
                ],
              ),
            ),
            const Divider(),

            // List
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : filteredServices.isEmpty
                      ? const Center(child: Text('No services found.', style: TextStyle(color: Colors.grey)))
                      : ListView.separated(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                          itemCount: filteredServices.length,
                          separatorBuilder: (context, index) => const Divider(height: 24),
                          itemBuilder: (context, index) {
                            final s = filteredServices[index];
                            return Row(
                              children: [
                                Expanded(
                                  flex: 3,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        s['name'] ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        (s['type'] ?? '').toString().replaceAll('_', ' ').toUpperCase(),
                                        style: TextStyle(fontSize: 9, color: context.textSecondary, fontWeight: FontWeight.w900),
                                      ),
                                    ],
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    _formatPrice(s, s['price']),
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade800, fontWeight: FontWeight.w500),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    _formatPrice(s, s['agentPrice'] ?? s['price']),
                                    style: const TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: Text(
                                    _formatPrice(s, s['vendorPrice'] ?? s['price']),
                                    style: const TextStyle(fontSize: 12, color: Colors.purple, fontWeight: FontWeight.w900),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
