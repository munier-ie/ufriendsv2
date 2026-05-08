import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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
