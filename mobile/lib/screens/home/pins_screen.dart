import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

class PinsScreen extends StatefulWidget {
  const PinsScreen({super.key});

  @override
  State<PinsScreen> createState() => _PinsScreenState();
}

class _PinsScreenState extends State<PinsScreen> {
  List<dynamic> _services = [];
  bool _loading = false;
  final bool _purchaseLoading = false;
  dynamic _selectedService;
  final _businessNameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchServices();
  }

  void _fetchServices() async {
    setState(() => _loading = true);
    final res = await ApiService.getPinsServices();
    setState(() => _loading = false);
    if (!mounted) return;

    if (res['success']) {
      setState(() => _services = res['services']);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['error'] ?? 'Failed to fetch services')));
    }
  }

  void _handlePurchase() async {
    if (_selectedService == null) return;

    final navigator = Navigator.of(context);
    final pinResult = await navigator.push(
      MaterialPageRoute(
        builder: (_) => PinScreen(
          title: 'Enter Transaction PIN',
          onVerify: (pin) async {
            return await ApiService.purchasePins(
              serviceId: _selectedService['id'].toString(),
              quantity: 1,
              amount: (_selectedService['price'] ?? 0).toDouble(),
              pin: pin,
              businessName: _businessNameController.text.isEmpty ? null : _businessNameController.text,
            );
          },
        ),
      ),
    );

    if (!mounted) return;

    if (pinResult != null) {
      final bool isSuccess = pinResult is Map ? pinResult['success'] == true : (pinResult == true);
      if (isSuccess) {
        final pin = pinResult['data']['pinContent'];
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Purchase Successful'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('PIN: $pin', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
            ],
          ),
        );
      } else {
        final errorMsg = pinResult is Map ? pinResult['error'] : 'Purchase failed';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMsg ?? 'Purchase failed')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.scaffoldBg,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _services.isEmpty
                      ? const Center(child: Text('No services available'))
                      : RefreshIndicator(
                          triggerMode: RefreshIndicatorTriggerMode.anywhere,
                          edgeOffset: 76,
                          onRefresh: () async {
                            _fetchServices();
                          },
                          color: AppTheme.primaryColor,
                          child: ListView(
                            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                            padding: const EdgeInsets.fromLTRB(16.0, 76.0, 16.0, 16.0),
                            children: [
                              DropdownButtonFormField<dynamic>(
                                initialValue: _selectedService,
                                items: _services.map((s) => DropdownMenuItem(value: s, child: Text('${s['name']} - ₦${s['price']}' ))).toList(),
                                onChanged: (val) => setState(() => _selectedService = val),
                                decoration: const InputDecoration(labelText: 'Select Pin Plan'),
                              ),
                              if (_selectedService != null && _selectedService['type'] == 'recharge_card') ...[
                                const SizedBox(height: 10),
                                TextFormField(
                                  controller: _businessNameController,
                                  decoration: const InputDecoration(labelText: 'Business Name (optional)'),
                                ),
                              ],
                              const SizedBox(height: 20),
                              ElevatedButton(
                                onPressed: _purchaseLoading || _selectedService == null ? null : _handlePurchase,
                                child: _purchaseLoading ? const CircularProgressIndicator() : const Text('Purchase'),
                              ),
                            ],
                          ),
                        ),
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: FloatingScreenHeader(
                title: 'Buy Pins',
                onBackPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
