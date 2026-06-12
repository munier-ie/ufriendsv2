import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/app_theme.dart';
import '../../core/custom_widgets.dart';
import 'login_screen.dart';
import 'signup_screen.dart';

class StartingScreen extends StatefulWidget {
  const StartingScreen({super.key});

  @override
  State<StartingScreen> createState() => _StartingScreenState();
}

class _StartingScreenState extends State<StartingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, String>> _carouselData = [
    {
      "title": "Welcome to Ufriends",
      "description": "Your ultimate platform for cheap data, airtime, and utility bill payments.",
    },
    {
      "title": "Our Services",
      "description": "Access cheap data, airtime, electricity bills, cable TV, exam pins, and more at your fingertips.",
    },
    {
      "title": "Earn While You Spend",
      "description": "Join our referral program, sell pins, and build your own digital business.",
    },
  ];

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: context.surfaceColor, // Premium clean white background
        body: SafeArea(
          child: Column(
            children: [
              // Push top tools down a bit
              const SizedBox(height: 10),
              
              // Top App Logo
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Row(
                    children: [
                      const AppLogo(size: 32),
                      const SizedBox(width: 8),
                      Text(
                        'Ufriends',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              
              // Push the content down by ~25%
              const Spacer(flex: 1),
              
              // Fixed Main Image with Perfect Circle Effect
              Expanded(
                flex: 4,
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 20.0, left: 32.0, right: 32.0),
                    child: AspectRatio(
                      aspectRatio: 1, // Ensures a perfect circle
                      child: ClipOval(
                        child: Image.asset(
                          'assets/images/onboarding.png',
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Icon(
                            Icons.image_not_supported_outlined,
                            size: 100,
                            color: Colors.grey.shade300,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              
              // Carousel Content (Text Only)
              Expanded(
                flex: 3,
                child: PageView.builder(
                  controller: _pageController,
                  onPageChanged: (index) {
                    setState(() {
                      _currentPage = index;
                    });
                  },
                  itemCount: _carouselData.length,
                  itemBuilder: (context, index) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          // Title
                          Text(
                            _carouselData[index]["title"]!,
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.primaryColor,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          // Description
                          Text(
                            _carouselData[index]["description"]!,
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: context.textSecondary,
                              fontSize: 16,
                              height: 1.5,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            
            // Indicators
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _carouselData.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentPage == index ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _currentPage == index ? AppTheme.primaryColor : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 40),
            
            // Action Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                children: [
                  GradientButton(
                    text: 'Get Started',
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const SignupScreen()));
                    },
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Already have an account? ', style: TextStyle(color: context.textSecondary, fontSize: 16)),
                      GestureDetector(
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                        },
                        child: const Text(
                          'Log In',
                          style: TextStyle(
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ],
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
