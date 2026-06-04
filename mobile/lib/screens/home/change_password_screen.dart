import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _loading = false;

  Future<void> _submit() async {
    final current = _currentPasswordController.text;
    final newPass = _newPasswordController.text;
    final confirm = _confirmPasswordController.text;

    if (current.isEmpty || newPass.isEmpty || confirm.isEmpty) {
      AppToast.show(context, message: 'All fields are required', type: ToastType.warning);
      return;
    }
    
    if (newPass != confirm) {
      AppToast.show(context, message: 'New passwords do not match', type: ToastType.error);
      return;
    }
    
    if (newPass.length < 6) {
      AppToast.show(context, message: 'Password must be at least 6 characters', type: ToastType.warning);
      return;
    }

    setState(() => _loading = true);
    
    final result = await ApiService.updatePassword(current, newPass);
    
    if (!mounted) return;
    
    setState(() => _loading = false);
    
    if (result['success']) {
      AppToast.show(context, message: result['message'] ?? 'Password updated successfully!', type: ToastType.success);
      Navigator.pop(context);
    } else {
      AppToast.show(context, message: result['error'] ?? 'Failed to update password', type: ToastType.error);
    }
  }

  Widget _buildPasswordField({
    required String label,
    required TextEditingController controller,
    required bool obscure,
    required VoidCallback toggleObscure,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscure,
          decoration: InputDecoration(
            hintText: 'Enter $label',
            filled: true,
            fillColor: Colors.grey.shade50,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            suffixIcon: IconButton(
              icon: Icon(obscure ? Icons.visibility_off : Icons.visibility, color: Colors.grey),
              onPressed: toggleObscure,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
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
                  BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 15, offset: const Offset(0, 4)),
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
                        'Change Password',
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
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.grey.shade100),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 15, offset: const Offset(0, 4))],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.lock_reset, color: AppTheme.primaryColor),
                              SizedBox(width: 8),
                              Text('Update your password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const SizedBox(height: 24),
                          
                          _buildPasswordField(
                            label: 'Current Password',
                            controller: _currentPasswordController,
                            obscure: _obscureCurrent,
                            toggleObscure: () => setState(() => _obscureCurrent = !_obscureCurrent),
                          ),
                          const SizedBox(height: 16),
                          
                          _buildPasswordField(
                            label: 'New Password',
                            controller: _newPasswordController,
                            obscure: _obscureNew,
                            toggleObscure: () => setState(() => _obscureNew = !_obscureNew),
                          ),
                          const SizedBox(height: 16),
                          
                          _buildPasswordField(
                            label: 'Confirm New Password',
                            controller: _confirmPasswordController,
                            obscure: _obscureConfirm,
                            toggleObscure: () => setState(() => _obscureConfirm = !_obscureConfirm),
                          ),
                          
                          const SizedBox(height: 32),
                          GradientButton(
                            text: 'Update Password',
                            loading: _loading,
                            onPressed: _submit,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
