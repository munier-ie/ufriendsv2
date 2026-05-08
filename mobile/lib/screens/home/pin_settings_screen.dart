import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/api_service.dart';
import '../../core/custom_widgets.dart';

class PinSettingsScreen extends StatefulWidget {
  const PinSettingsScreen({super.key});

  @override
  State<PinSettingsScreen> createState() => _PinSettingsScreenState();
}

class _PinSettingsScreenState extends State<PinSettingsScreen> {
  bool _isLoading = true;
  bool _hasPin = false;
  bool _isSettingPin = false; // true if user is setting PIN via OTP
  bool _otpSent = false;
  bool _isSendingOtp = false;
  
  final _currentPinController = TextEditingController();
  final _newPinController = TextEditingController();
  final _confirmPinController = TextEditingController();
  final _otpController = TextEditingController();

  final _currentPinFocusNode = FocusNode();
  final _newPinFocusNode = FocusNode();
  final _confirmPinFocusNode = FocusNode();
  final _otpFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _fetchProfile();
    
    // Add listeners to rebuild when focus changes
    _currentPinFocusNode.addListener(_onFocusChange);
    _newPinFocusNode.addListener(_onFocusChange);
    _confirmPinFocusNode.addListener(_onFocusChange);
    _otpFocusNode.addListener(_onFocusChange);
  }

  void _onFocusChange() {
    setState(() {});
  }

  void _fetchProfile() async {
    final res = await ApiService.getProfile();
    if (!mounted) return;
    
    if (res['success'] == true) {
      final user = res['user'];
      setState(() {
        _hasPin = user['pinEnabled'] ?? false;
        _isLoading = false;
        if (!_hasPin) {
          _isSettingPin = true;
        }
      });
    } else {
      setState(() {
        _isLoading = false;
      });
      AppToast.show(context, message: 'Failed to load profile', type: ToastType.warning);
    }
  }

  @override
  void dispose() {
    _currentPinController.dispose();
    _newPinController.dispose();
    _confirmPinController.dispose();
    _otpController.dispose();
    
    _currentPinFocusNode.removeListener(_onFocusChange);
    _newPinFocusNode.removeListener(_onFocusChange);
    _confirmPinFocusNode.removeListener(_onFocusChange);
    _otpFocusNode.removeListener(_onFocusChange);
    
    _currentPinFocusNode.dispose();
    _newPinFocusNode.dispose();
    _confirmPinFocusNode.dispose();
    _otpFocusNode.dispose();
    
    super.dispose();
  }

  void _sendOtp() async {
    setState(() { _isSendingOtp = true; });
    final res = await ApiService.forgotPin();
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    setState(() { _isSendingOtp = false; });
    
    if (res['success'] == true) {
      AppToast.show(context, message: 'OTP sent to your email', type: ToastType.success);
      setState(() {
        _otpSent = true;
      });
    } else {
      AppToast.show(context, message: res['error'] ?? 'Failed to send OTP', type: ToastType.warning);
    }
  }

  void _updatePin() async {
    final newPin = _newPinController.text;
    final confirm = _confirmPinController.text;

    if (newPin.length < 4 || confirm.length < 4) {
      AppToast.show(context, message: 'PIN must be 4 digits', type: ToastType.warning);
      return;
    }

    if (newPin != confirm) {
      AppToast.show(context, message: 'PINs do not match', type: ToastType.warning);
      return;
    }

    if (_isSettingPin) {
      final otp = _otpController.text;
      if (otp.length < 6) {
        AppToast.show(context, message: 'Please enter 6-digit OTP', type: ToastType.warning);
        return;
      }

      AppToast.show(context, message: 'Processing...', type: ToastType.warning);
      final res = await ApiService.resetPinWithOtp(
        otp: otp,
        newPin: newPin,
        confirmPin: confirm,
      );

      if (!mounted) return;
      if (res['success'] == true) {
        AppToast.show(context, message: 'PIN set successfully', type: ToastType.success);
        Navigator.pop(context);
      } else {
        AppToast.show(context, message: res['error'] ?? 'Failed to set PIN', type: ToastType.warning);
      }
    } else {
      final current = _currentPinController.text;
      if (current.length < 4) {
        AppToast.show(context, message: 'Please enter current PIN', type: ToastType.warning);
        return;
      }

      AppToast.show(context, message: 'Updating...', type: ToastType.warning);
      final res = await ApiService.updatePin(
        currentPin: current,
        newPin: newPin,
      );

      if (!mounted) return;
      if (res['success'] == true) {
        AppToast.show(context, message: 'PIN updated successfully', type: ToastType.success);
        Navigator.pop(context);
      } else {
        AppToast.show(context, message: res['error'] ?? 'Failed to update PIN', type: ToastType.warning);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: Column(
            children: [
              // Custom Floating TopBar
              Container(
                margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: Colors.grey.shade200, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.black87),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'PIN Settings',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    const Spacer(),
                  ],
                ),
              ),
              
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E90FF)))
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 16),
                            Text(
                              _isSettingPin ? 'Set New PIN' : 'Change PIN',
                              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.black87),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _isSettingPin 
                                ? 'Verify your account and set a new transaction PIN.'
                                : 'Update your existing transaction PIN.',
                              style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 32),
                            
                            if (_hasPin)
                              Container(
                                height: 50,
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(25),
                                  border: Border.all(color: Colors.grey.shade200),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            _isSettingPin = false;
                                            _otpSent = false;
                                          });
                                        },
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: !_isSettingPin ? const Color(0xFF1E90FF) : Colors.transparent,
                                            borderRadius: BorderRadius.circular(25),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            'Change PIN',
                                            style: TextStyle(
                                              color: !_isSettingPin ? Colors.white : Colors.black54,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                    Expanded(
                                      child: GestureDetector(
                                        onTap: () {
                                          setState(() {
                                            _isSettingPin = true;
                                          });
                                        },
                                        child: Container(
                                          decoration: BoxDecoration(
                                            color: _isSettingPin ? const Color(0xFF1E90FF) : Colors.transparent,
                                            borderRadius: BorderRadius.circular(25),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            'Forgot/Set PIN',
                                            style: TextStyle(
                                              color: _isSettingPin ? Colors.white : Colors.black54,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            
                            const SizedBox(height: 32),
                            
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: Colors.grey.shade100),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.03),
                                    blurRadius: 15,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (_isSettingPin && !_otpSent) ...[
                                    const Center(
                                      child: Icon(Icons.mark_email_read_outlined, size: 48, color: Color(0xFF1E90FF)),
                                    ),
                                    const SizedBox(height: 16),
                                    const Center(
                                      child: Text(
                                        'Security Verification',
                                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    const Center(
                                      child: Text(
                                        'We need to verify your account before you can set a PIN.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(fontSize: 14, color: Colors.black54),
                                      ),
                                    ),
                                    const SizedBox(height: 24),
                                    Center(
                                      child: _isSendingOtp
                                          ? const CircularProgressIndicator(color: Color(0xFF1E90FF))
                                          : GradientButton(
                                              text: 'Send OTP to Email',
                                              onPressed: _sendOtp,
                                            ),
                                    ),
                                  ],
                                  
                                  if (_isSettingPin && _otpSent) ...[
                                    const Text(
                                      'Enter 6-digit OTP',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
                                    ),
                                    const SizedBox(height: 12),
                                    _buildPinInput(
                                      length: 6,
                                      controller: _otpController,
                                      focusNode: _otpFocusNode,
                                      onCompleted: (val) {},
                                    ),
                                    const SizedBox(height: 32),
                                  ],
                                  
                                  if (!_isSettingPin) ...[
                                    const Text(
                                      'Current PIN',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
                                    ),
                                    const SizedBox(height: 12),
                                    _buildPinInput(
                                      length: 4,
                                      controller: _currentPinController,
                                      focusNode: _currentPinFocusNode,
                                      onCompleted: (val) {},
                                    ),
                                    const SizedBox(height: 32),
                                  ],
                                  
                                  if (!_isSettingPin || (_isSettingPin && _otpSent)) ...[
                                    const Text(
                                      'New PIN',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
                                    ),
                                    const SizedBox(height: 12),
                                    _buildPinInput(
                                      length: 4,
                                      controller: _newPinController,
                                      focusNode: _newPinFocusNode,
                                      onCompleted: (val) {},
                                    ),
                                    const SizedBox(height: 32),
                                    
                                    const Text(
                                      'Confirm New PIN',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
                                    ),
                                    const SizedBox(height: 12),
                                    _buildPinInput(
                                      length: 4,
                                      controller: _confirmPinController,
                                      focusNode: _confirmPinFocusNode,
                                      onCompleted: (val) {},
                                    ),
                                    const SizedBox(height: 40),
                                    
                                    SizedBox(
                                      width: double.infinity,
                                      child: GradientButton(
                                        text: _isSettingPin ? 'Set PIN' : 'Update PIN',
                                        onPressed: _updatePin,
                                      ),
                                    ),
                                  ],
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
      ),
    );
  }

  Widget _buildPinInput({
    required int length,
    required TextEditingController controller,
    required FocusNode focusNode,
    required Function(String) onCompleted,
  }) {
    return Stack(
      children: [
        // Hidden TextField that handles real input, paste, and deletion
        Positioned.fill(
          child: Opacity(
            opacity: 0,
            child: TextField(
            controller: controller,
            focusNode: focusNode,
            keyboardType: TextInputType.number,
            maxLength: length,
            onChanged: (val) {
              if (val.length == length) {
                onCompleted(val);
              }
              setState(() {}); // Rebuild to update UI dots
            },
            decoration: const InputDecoration(
              counterText: '',
            ),
          ),
        ),
      ),
        // Visible styled boxes
        IgnorePointer(
          child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(length, (index) {
            final isFilled = index < controller.text.length;
            // Only show focused border if the text field actually has focus!
            final isFocused = focusNode.hasFocus && 
                (index == controller.text.length || (index == length - 1 && controller.text.length == length));
            
            return Container(
              width: length == 6 ? 40 : 50,
              height: length == 6 ? 45 : 56,
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isFocused 
                      ? const Color(0xFF1E90FF) 
                      : (isFilled ? const Color(0xFF1E90FF) : Colors.grey.shade200),
                  width: isFocused || isFilled ? 2 : 1,
                ),
              ),
              alignment: Alignment.center,
              child: isFilled
                  ? Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: Colors.black87,
                        shape: BoxShape.circle,
                      ),
                    )
                  : null,
            );
          }),
        ),
      ),
    ],
    );
  }
}
