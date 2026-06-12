import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import '../../core/api_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  int _currentStep = 0;
  final TextEditingController _emailController = TextEditingController();
  final List<TextEditingController> _otpControllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());
  
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();
  
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var node in _otpFocusNodes) {
      node.dispose();
    }
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _nextStep() {
    setState(() {
      _currentStep++;
    });
  }

  void _prevStep() {
    if (_currentStep > 0) {
      setState(() {
        _currentStep--;
      });
    } else {
      Navigator.pop(context);
    }
  }

  Future<void> _handleEmailSubmit() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      AppToast.show(context, message: 'Please enter a valid email address', type: ToastType.error);
      return;
    }
    setState(() => _isLoading = true);
    final result = await ApiService.forgotPasswordOtp(email);
    setState(() => _isLoading = false);

    if (!mounted) return;
    if (result['success']) {
      AppToast.show(context, message: result['message'], type: ToastType.success);
      _nextStep();
    } else {
      if (!mounted) return;
      AppToast.show(context, message: result['error'], type: ToastType.error);
    }
  }

  Future<void> _handleOtpSubmit() async {
    String otp = _otpControllers.map((c) => c.text).join();
    if (otp.length != 6) {
      AppToast.show(context, message: 'Please enter the 6-digit OTP', type: ToastType.error);
      return;
    }
    _nextStep();
  }

  Future<void> _handlePasswordSubmit() async {
    final newPassword = _passwordController.text;
    final confirmPassword = _confirmPasswordController.text;
    final email = _emailController.text.trim();
    final otp = _otpControllers.map((c) => c.text).join();

    if (newPassword.length < 6) {
      AppToast.show(context, message: 'Password must be at least 6 characters', type: ToastType.error);
      return;
    }
    if (newPassword != confirmPassword) {
      AppToast.show(context, message: 'Passwords do not match', type: ToastType.error);
      return;
    }
    
    setState(() => _isLoading = true);
    final result = await ApiService.resetPasswordOtp(email, otp, newPassword);
    setState(() => _isLoading = false);

    if (result['success']) {
      if (!mounted) return;
      _nextStep();
    } else {
      if (!mounted) return;
      AppToast.show(context, message: result['error'], type: ToastType.error);
    }
  }

  void _handleOtpInput(String value, int index) {
    if (value.length > 1) {
      _handleOtpPaste(value);
      return;
    }
    if (value.length == 1 && index < 5) {
      _otpFocusNodes[index + 1].requestFocus();
    } else if (value.isEmpty && index > 0) {
      _otpFocusNodes[index - 1].requestFocus();
    }
  }

  void _handleOtpPaste(String data) {
    if (data.length == 6 && RegExp(r'^\d+$').hasMatch(data)) {
      for (int i = 0; i < 6; i++) {
        _otpControllers[i].text = data[i];
      }
      _otpFocusNodes[5].requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.surfaceColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF1E90FF)),
          onPressed: _prevStep,
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: _buildStepContent(),
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0: return _buildEmailStep();
      case 1: return _buildOtpStep();
      case 2: return _buildNewPasswordStep();
      case 3: return _buildSuccessStep();
      default: return _buildEmailStep();
    }
  }

  Widget _buildEmailStep() {
    return Column(
      key: const ValueKey(0),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Text(
          'Forgot Password?',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppTheme.primaryColor,
            fontSize: 28,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Enter your email address to receive a password reset code.',
          style: TextStyle(color: context.textSecondary, fontSize: 16),
        ),
        const SizedBox(height: 60),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Email Address',
            prefixIcon: Icon(Icons.email_outlined),
          ),
        ),
        const SizedBox(height: 60),
        GradientButton(
          text: 'Send Code',
          onPressed: _handleEmailSubmit,
          loading: _isLoading,
        ),
      ],
    );
  }

  Widget _buildOtpStep() {
    return Column(
      key: const ValueKey(1),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Text(
          'Verification Code',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppTheme.primaryColor,
            fontSize: 28,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'We have sent a 6-digit code to ${_emailController.text}.',
          style: TextStyle(color: context.textSecondary, fontSize: 16),
        ),
        const SizedBox(height: 60),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(6, (index) {
            return SizedBox(
              width: 45,
              child: TextField(
                controller: _otpControllers[index],
                focusNode: _otpFocusNodes[index],
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: index == 0 ? 6 : 1, // Allow 6 chars in first field for paste
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(index == 0 ? 6 : 1),
                ],
                decoration: const InputDecoration(
                  counterText: "",
                  contentPadding: EdgeInsets.symmetric(vertical: 12),
                ),
                onChanged: (v) {
                  if (v.length > 1 && index == 0) {
                    _handleOtpPaste(v);
                  } else {
                    _handleOtpInput(v, index);
                  }
                },
              ),
            );
          }),
        ),
        const SizedBox(height: 60),
        GradientButton(
          text: 'Verify OTP',
          onPressed: _handleOtpSubmit,
          loading: _isLoading,
        ),
        const SizedBox(height: 32),
        Center(
          child: TextButton(
            onPressed: _handleEmailSubmit,
            child: const Text(
              'Resend Code',
              style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNewPasswordStep() {
    return Column(
      key: const ValueKey(2),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Text(
          'New Password',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppTheme.primaryColor,
            fontSize: 28,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Please choose a strong password for your account.',
          style: TextStyle(color: context.textSecondary, fontSize: 16),
        ),
        const SizedBox(height: 60),
        TextField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          decoration: InputDecoration(
            labelText: 'New Password',
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
          ),
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _confirmPasswordController,
          obscureText: _obscureConfirmPassword,
          decoration: InputDecoration(
            labelText: 'Confirm Password',
            prefixIcon: const Icon(Icons.lock_reset),
            suffixIcon: IconButton(
              icon: Icon(_obscureConfirmPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
              onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
            ),
          ),
        ),
        const SizedBox(height: 60),
        GradientButton(
          text: 'Reset Password',
          onPressed: _handlePasswordSubmit,
          loading: _isLoading,
        ),
      ],
    );
  }

  Widget _buildSuccessStep() {
    return Center(
      key: const ValueKey(3),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.successColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle_rounded, color: AppTheme.successColor, size: 80),
          ),
          const SizedBox(height: 32),
          Text(
            'Success!',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: AppTheme.primaryColor,
              fontSize: 32,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Your password has been reset successfully.',
            textAlign: TextAlign.center,
            style: TextStyle(color: context.textSecondary, fontSize: 16),
          ),
          const SizedBox(height: 60),
          GradientButton(
            text: 'Back to Login',
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}

