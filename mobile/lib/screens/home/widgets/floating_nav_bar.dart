import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../core/app_theme.dart';

class FloatingNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabSelected;

  const FloatingNavBar({
    super.key,
    required this.currentIndex,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 66,
      decoration: BoxDecoration(
        color: context.glassBg,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: context.glassBorder.withValues(alpha: 0.6), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: context.isDark 
                ? Colors.black.withValues(alpha: 0.5) 
                : Colors.black.withValues(alpha: 0.15),
            blurRadius: 25,
            spreadRadius: 2,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _navItem(context, 0, Icons.home_rounded, 'Home'),
              _navItem(context, 1, Icons.account_balance_wallet_rounded, 'Wallet'),
              _navItem(context, 2, Icons.grid_view_rounded, 'Services'),
              _navItem(context, 3, Icons.receipt_long_rounded, 'Activity'),
              _navItem(context, 4, Icons.person_rounded, 'Profile'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _navItem(BuildContext context, int index, IconData icon, String label) {
    bool isActive = currentIndex == index;
    const Color activeColor = Color(0xFF1E90FF); // DodgerBlue
    
    return GestureDetector(
      onTap: () => onTabSelected(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? activeColor.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          children: [
            Icon(
              icon, 
              color: isActive ? activeColor : context.iconDefault, 
              size: 24
            ),
            if (isActive) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: activeColor, 
                  fontWeight: FontWeight.bold, 
                  fontSize: 13
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
