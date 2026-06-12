import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/auth_service.dart';
import '../../core/custom_widgets.dart';
import '../../core/biometric_service.dart';
import 'starting_screen.dart';
import 'login_screen.dart';
import 'lock_screen.dart';
import '../home/home_screen.dart';
import '../../core/app_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    _controller.forward();
    _navigateToNext();
  }

  Future<void> _navigateToNext() async {
    // Wait for animation and splash time
    await Future.delayed(const Duration(seconds: 3));
    
    if (!mounted) return;

    // Determine initial route
    bool firstLaunch = await AuthService.isFirstLaunch();
    bool loggedIn = await AuthService.isLoggedIn();

    // Request notification permission for new users or users about to login
    if (firstLaunch || !loggedIn) {
      final status = await Permission.notification.status;
      if (status.isDenied) {
        await Permission.notification.request();
      } else if (status.isPermanentlyDenied) {
        if (mounted) await showPermissionDeniedDrawer(context);
      }
    }

    Widget nextScreen;
    if (firstLaunch) {
      await AuthService.setHasLaunched(); // Set to false for next time
      nextScreen = const StartingScreen();
    } else if (loggedIn) {
      final biometricsEnabled = await BiometricService.isBiometricsEnabled();
      if (biometricsEnabled) {
        nextScreen = const LockScreen();
      } else {
        nextScreen = const HomeScreen();
      }
    } else {
      nextScreen = const LoginScreen();
    }

    if (!mounted) return;
    
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => nextScreen,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
        transitionDuration: const Duration(milliseconds: 800),
      ),
    );
  }



  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: context.cardColor,
        body: Stack(
          children: [
            const Center(
              child: AppLogo(size: 100),
            ),
            Positioned(
              bottom: MediaQuery.of(context).size.height * 0.15,
              left: 0,
              right: 0,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 200,
                    child: AnimatedBuilder(
                      animation: _controller,
                      builder: (context, child) {
                        return LinearProgressIndicator(
                          value: _controller.value,
                          backgroundColor: Colors.grey.shade100,
                          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF1E90FF)),
                          borderRadius: BorderRadius.circular(4),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Loading...',
                    style: TextStyle(color: context.textMuted, fontSize: 14),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
