import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme_state.dart';

class AppTheme {
  static const Color primaryColor = Color(0xFF004687);
  static const Color secondaryColor = Color(0xFF1E90FF);
  static const Color backgroundColor = Color(0xFFF3F4F6);
  static const Color surfaceColor = Color(0xFFFFFFFF);
  static const Color successColor = Color(0xFF10B981);
  static const Color warningColor = Color(0xFFF59E0B);
  static const Color errorColor = Color(0xFFEF4444);

  static const double borderRadius = 24.0;
  static const double baseFontSize = 14.0;
  static const double spacingMultiplier = 0.5;
  static const String fontFamily = 'Poppins';

  static LinearGradient get primaryGradient => const LinearGradient(
        colors: [primaryColor, secondaryColor],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );

  static ThemeData get themeData {
    final textTheme = GoogleFonts.getTextTheme(fontFamily).copyWith(
      bodyLarge: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize + 2),
      bodyMedium: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize),
      titleLarge: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize + 8, fontWeight: FontWeight.bold),
      titleMedium: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize + 4, fontWeight: FontWeight.bold),
    );

    return ThemeData(
      useMaterial3: true,
      iconTheme: const IconThemeData(
        color: secondaryColor,
      ),
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: secondaryColor,
        error: errorColor,
        surface: surfaceColor,
        onSurface: Colors.black87,
      ),
      textTheme: textTheme,
      scaffoldBackgroundColor: backgroundColor,
      cardTheme: CardThemeData(
        color: surfaceColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          side: BorderSide(color: Colors.grey.shade200, width: 1),
        ),
        margin: EdgeInsets.all(8.0 * spacingMultiplier),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: EdgeInsets.symmetric(
            horizontal: 16.0 * spacingMultiplier,
            vertical: 12.0 * spacingMultiplier,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryColor,
          side: const BorderSide(color: primaryColor, width: 1.5),
          padding: EdgeInsets.symmetric(
            horizontal: 16.0 * spacingMultiplier,
            vertical: 12.0 * spacingMultiplier,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          textStyle: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize, fontWeight: FontWeight.bold),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceColor,
        prefixIconColor: secondaryColor,
        suffixIconColor: secondaryColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(borderRadius / 2),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(borderRadius / 2),
          borderSide: BorderSide(color: Colors.grey.shade200),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(borderRadius / 2),
          borderSide: const BorderSide(color: primaryColor, width: 1.5),
        ),
        contentPadding: EdgeInsets.all(32.0 * spacingMultiplier),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surfaceColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedItemColor: primaryColor,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: backgroundColor,
        disabledColor: Colors.grey.shade200,
        selectedColor: primaryColor.withValues(alpha: 0.2),
        secondarySelectedColor: secondaryColor.withValues(alpha: 0.2),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        labelStyle: GoogleFonts.getFont(fontFamily, fontSize: 12),
        secondaryLabelStyle: GoogleFonts.getFont(fontFamily, fontSize: 12, color: primaryColor),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(borderRadius)),
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: Colors.transparent,
        elevation: 0,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

/// Extension on [BuildContext] providing semantic, dark-mode-aware colors.
/// Use these getters in all screen widgets instead of hardcoded Colors.white/black87/grey.
extension AppThemeContext on BuildContext {
  ThemeState get _ts => Provider.of<ThemeState>(this, listen: true);
  bool get isDark => _ts.isDarkMode;

  // ── Surfaces ──────────────────────────────────────────────────────────────
  Color get cardColor => isDark ? const Color(0xFF1E1E1E) : Colors.white;
  Color get scaffoldBg => isDark ? const Color(0xFF121212) : const Color(0xFFF3F4F6);
  Color get surfaceColor => isDark ? const Color(0xFF2A2A2A) : Colors.white;
  Color get bottomSheetBg => isDark ? const Color(0xFF1E1E1E) : Colors.white;
  Color get inputFillColor => isDark ? const Color(0xFF2A2A2A) : Colors.white;

  // ── Text ───────────────────────────────────────────────────────────────────
  Color get textPrimary => isDark ? Colors.white : Colors.black87;
  Color get textSecondary => isDark ? Colors.grey.shade400 : Colors.grey.shade600;
  Color get textMuted => isDark ? Colors.grey.shade500 : Colors.grey.shade500;
  Color get textHint => isDark ? Colors.grey.shade600 : Colors.grey.shade400;

  // ── Borders & dividers ─────────────────────────────────────────────────────
  Color get borderColor => isDark ? Colors.grey.shade800 : Colors.grey.shade200;
  Color get dividerColor => isDark ? Colors.grey.shade800 : Colors.grey.shade100;
  Color get subtleBg => isDark ? Colors.grey.shade900 : Colors.grey.shade50;

  // ── Glass / frosted elements (top bar, nav bar) ────────────────────────────
  Color get glassBg => isDark
      ? const Color(0xFF3E3E3E).withValues(alpha: 0.60)
      : Colors.white.withValues(alpha: 0.90);
  Color get glassBorder => isDark
      ? Colors.white.withValues(alpha: 0.10)
      : Colors.white.withValues(alpha: 0.60);
  Color get glassShadow => isDark
      ? Colors.black.withValues(alpha: 0.30)
      : Colors.black.withValues(alpha: 0.10);

  // ── Card Gradients ─────────────────────────────────────────────────────────
  LinearGradient get cardGradient => isDark
      ? const LinearGradient(
          colors: [
            Color(0xFF1F2937), // Deep slate grey/blue
            Color(0xFF111827), // Almost black
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        )
      : AppTheme.primaryGradient;

  // ── Icon colors ────────────────────────────────────────────────────────────
  Color get iconDefault => isDark ? Colors.grey.shade400 : Colors.grey.shade600;
  Color get iconMuted => isDark ? Colors.grey.shade600 : Colors.grey.shade400;
}
