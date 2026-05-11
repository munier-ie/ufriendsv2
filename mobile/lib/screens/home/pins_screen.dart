import 'package:flutter/material.dart';
import '../../core/api_service.dart';

class PinsScreen extends StatefulWidget {
  const PinsScreen({super.key});

  @override
  State<PinsScreen> createState() => _PinsScreenState();
}

class _PinsScreenState extends State<PinsScreen> {
  List<dynamic> _services = [];
  bool _loading = false;
  bool _purchaseLoading = false;
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

    setState(() => _purchaseLoading = true);
    final res = await ApiService.purchasePins(
      serviceId: _selectedService['id'].toString(),
      quantity: 1,
      businessName: _businessNameController.text.isEmpty ? null : _businessNameController.text,
    );
    setState(() => _purchaseLoading = false);
    if (!mounted) return;

    if (res['success']) {
      final pin = res['data']['pin'];
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Purchase Successful'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('PIN: ${pin['content']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              if (pin['serialNumber'] != null) Text('Serial: ${pin['serialNumber']}'),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
          ],
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(res['error'] ?? 'Purchase failed')));
    }

  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buy Pins')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _services.isEmpty
              ? const Center(child: Text('No services available'))
              : ListView(
                  padding: const EdgeInsets.all(16.0),
                  children: [
                    DropdownButtonFormField<dynamic>(
                      initialValue: _selectedService,

                      items: _services.map((s) => DropdownMenuItem(value: s, child: Text('${s['name']} - ₦${s['price']}'))).toList(),
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
    );
  }
}
