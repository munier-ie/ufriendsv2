import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';
import 'pin_screen.dart';

class LoanRequestScreen extends StatefulWidget {
  const LoanRequestScreen({super.key});

  @override
  State<LoanRequestScreen> createState() => _LoanRequestScreenState();
}

class _LoanRequestScreenState extends State<LoanRequestScreen> {
  final Map<String, dynamic> _formData = {};
  bool _submitting = false;

  void _updateField(String key, dynamic value) {
    setState(() => _formData[key] = value);
  }

  void _submit() async {
    if (_formData['accountNumber'] == null || _formData['accountNumber'].toString().length < 10) return _showError('Please enter a valid 10-digit account number');
    if (_formData['contactDetails'] == null || _formData['contactDetails'].toString().isEmpty) return _showError('Please enter contact details');
    if (_formData['amountNeeded'] == null || _formData['amountNeeded'].toString().isEmpty) return _showError('Please enter loan amount');
    if (_formData['repaymentSchedule'] == null) return _showError('Please select repayment schedule');
    if (_formData['duration'] == null) return _showError('Please select loan duration');

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PinScreen(
          onVerify: (pin) async {
            setState(() => _submitting = true);
            try {
              return await ApiService.submitManualService(
                serviceType: 'LOAN_REQUEST',
                subType: '',
                details: _formData,
                pin: pin,
              );
            } finally {
              if (mounted) setState(() => _submitting = false);
            }
          },
        ),
      ),
    );

    if (result != null && mounted) {
      if (result['success'] == true) {
        Navigator.pop(context); // close screen
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Loan Request submitted successfully', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green),
        );
      } else {
        _showError(result['error'] ?? 'Failed to submit request');
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.scaffoldBg,
      appBar: const PremiumAppBar(title: 'Loan Request'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeaderCard(),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: context.dividerColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PremiumTextField(
                    label: 'Bank Account Number',
                    hintText: 'Enter 10-digit account number',
                    keyboardType: TextInputType.number,
                    onChanged: (v) => _updateField('accountNumber', v.replaceAll(RegExp(r'\D'), '')),
                  ),
                  const SizedBox(height: 16),
                  PremiumTextField(
                    label: 'Contact Details',
                    hintText: 'Phone number or email address',
                    onChanged: (v) => _updateField('contactDetails', v),
                  ),
                  const SizedBox(height: 16),
                  PremiumTextField(
                    label: 'Amount Needed (₦)',
                    hintText: 'Enter amount',
                    keyboardType: TextInputType.number,
                    onChanged: (v) => _updateField('amountNeeded', v.replaceAll(RegExp(r'\D'), '')),
                  ),
                  const SizedBox(height: 16),
                  _buildDropdown('Repayment Schedule', 'repaymentSchedule', [
                    {'value': 'Weekly', 'label': 'Weekly'},
                    {'value': 'Monthly', 'label': 'Monthly'},
                  ]),
                  const SizedBox(height: 16),
                  _buildDropdown('Duration', 'duration', [
                    {'value': '12weeks', 'label': '12 Weeks'},
                    {'value': '24weeks', 'label': '24 Weeks'},
                    {'value': '36weeks', 'label': '36 Weeks'},
                    {'value': '52weeks', 'label': '52 Weeks'},
                  ]),
                ],
              ),
            ),
            const SizedBox(height: 32),
            PremiumButton(
              text: 'Submit Loan Request',
              onPressed: _submitting ? null : _submit,
              isLoading: _submitting,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: context.cardGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.2),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('Loan Service', style: TextStyle(color: Colors.white70, fontSize: 14)),
              SizedBox(height: 4),
              Text('Apply for a Loan', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
              SizedBox(height: 4),
              Text('Zero Processing Fees', style: TextStyle(color: Colors.white70, fontSize: 12)),
            ],
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
            child: const Icon(Icons.money_rounded, color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown(String label, String field, List<Map<String, String>> options) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: context.cardColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.dividerColor),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: _formData[field],
              hint: const Text('Select Option'),
              dropdownColor: context.cardColor,
              items: options.map((o) => DropdownMenuItem<String>(value: o['value'], child: Text(o['label']!))).toList(),
              onChanged: (v) => _updateField(field, v),
            ),
          ),
        ),
      ],
    );
  }
}
