import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/app_theme.dart';
import '../../../core/custom_widgets.dart';
import '../../../core/auth_service.dart';
import '../../../core/biometric_service.dart';
import '../home/home_screen.dart';
import 'login_screen.dart';

class LockScreen extends StatefulWidget {
  const LockScreen({super.key});

  static bool isShowing = false;

  @override
  State<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<LockScreen> {
  bool _authenticating = false;

  @override
  void initState() {
    super.initState();
    LockScreen.isShowing = true;
    // Auto-authenticate on first frame after building
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startBiometricAuth();
    });
  }

  @override
  void dispose() {
    LockScreen.isShowing = false;
    super.dispose();
  }

  Future<void> _startBiometricAuth() async {
    if (_authenticating) return;
    setState(() => _authenticating = true);

    bool success = await BiometricService.authenticate();
    
    if (mounted) {
      setState(() => _authenticating = false);
      if (success) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      } else {
        // Silently fail on backgrounding / lock screen initialization to prevent annoying repetitive toasts
      }
    }
  }

  Future<void> _handleManualLogin() async {
    await AuthService.logout();
    if (mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: context.cardColor,
        body: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const SizedBox(height: 40),
              
              // Top Section (Logo and title)
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const AppLogo(size: 88),
                  const SizedBox(height: 24),
                  Text(
                    'Welcome Back',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'App is locked for security',
                    style: TextStyle(
                      color: context.textMuted,
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
              
              // Center Section (Biometrics button)
              GestureDetector(
                onTap: _startBiometricAuth,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.05),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: _authenticating
                        ? const CircularProgressIndicator(
                            color: AppTheme.primaryColor,
                          )
                        : const Icon(
                            Icons.fingerprint_rounded,
                            size: 56,
                            color: AppTheme.secondaryColor,
                          ),
                  ),
                ),
              ),
              
              // Bottom Section (Instruction and fallback manual button)
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Tap the icon to scan fingerprint or face',
                      style: TextStyle(
                        color: context.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 32),
                    TextButton(
                      onPressed: _handleManualLogin,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: context.borderColor),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.login_rounded, color: AppTheme.primaryColor, size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'Log In Manually',
                            style: TextStyle(
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
