import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ThemeState extends ChangeNotifier {
  Color primaryColor = const Color(0xFF004687);
  Color secondaryColor = const Color(0xFF1E90FF);
  Color backgroundColor = const Color(0xFFF3F4F6);
  Color surfaceColor = const Color(0xFFFFFFFF);
  
  Color successColor = const Color(0xFF10B981);
  Color warningColor = const Color(0xFFF59E0B);
  Color errorColor = const Color(0xFFEF4444);

  double borderRadius = 24.0; // Increased for a more modern, rounded look
  double baseFontSize = 14.0;
  double spacingMultiplier = 1.0;
  String fontFamily = 'Inter';

  // Gradient Helper
  LinearGradient get primaryGradient => LinearGradient(
    colors: [primaryColor, secondaryColor],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  final List<String> availableFonts = [
    'Inter',
    'Roboto',
    'Poppins',
    'Lato',
    'Montserrat',
    'Open Sans',
    'Outfit',
  ];

  void updatePrimaryColor(Color color) {
    primaryColor = color;
    notifyListeners();
  }

  void updateSecondaryColor(Color color) {
    secondaryColor = color;
    notifyListeners();
  }

  void updateBackgroundColor(Color color) {
    backgroundColor = color;
    notifyListeners();
  }

  void updateSurfaceColor(Color color) {
    surfaceColor = color;
    notifyListeners();
  }

  void updateSuccessColor(Color color) {
    successColor = color;
    notifyListeners();
  }

  void updateWarningColor(Color color) {
    warningColor = color;
    notifyListeners();
  }

  void updateErrorColor(Color color) {
    errorColor = color;
    notifyListeners();
  }

  void updateBorderRadius(double radius) {
    borderRadius = radius;
    notifyListeners();
  }

  void updateBaseFontSize(double size) {
    baseFontSize = size;
    notifyListeners();
  }

  void updateSpacingMultiplier(double multiplier) {
    spacingMultiplier = multiplier;
    notifyListeners();
  }

  void updateFontFamily(String font) {
    fontFamily = font;
    notifyListeners();
  }

  ThemeData get themeData {
    final textTheme = GoogleFonts.getTextTheme(fontFamily).copyWith(
      bodyLarge: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize + 2),
      bodyMedium: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize),
      titleLarge: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize + 8, fontWeight: FontWeight.bold),
      titleMedium: GoogleFonts.getFont(fontFamily, fontSize: baseFontSize + 4, fontWeight: FontWeight.bold),
    );

    return ThemeData(
      useMaterial3: true,
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
        elevation: 0, // Minimalist: low elevation, use borders or subtle shadows
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          side: BorderSide(color: Colors.grey.shade200, width: 1),
        ),
        margin: EdgeInsets.all(8.0 * spacingMultiplier),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent, // We will use a wrapper for gradient
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
          side: BorderSide(color: primaryColor, width: 1.5),
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
          borderSide: BorderSide(color: primaryColor, width: 1.5),
        ),
        contentPadding: EdgeInsets.all(12.0 * spacingMultiplier),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surfaceColor,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
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
      snackBarTheme: SnackBarThemeData(
        backgroundColor: Colors.transparent, // Custom toast will handle this
        elevation: 0,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String exportTheme() {
    String colorToHex(Color color) {
      return '0x${color.toARGB32().toRadixString(16).padLeft(8, '0').toUpperCase()}';
    }

    return '''
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color primaryColor = Color(${colorToHex(primaryColor)});
  static const Color secondaryColor = Color(${colorToHex(secondaryColor)});
  static const Color backgroundColor = Color(${colorToHex(backgroundColor)});
  static const Color surfaceColor = Color(${colorToHex(surfaceColor)});
  static const Color successColor = Color(${colorToHex(successColor)});
  static const Color warningColor = Color(${colorToHex(warningColor)});
  static const Color errorColor = Color(${colorToHex(errorColor)});
  
  static const double borderRadius = $borderRadius;
  static const double baseFontSize = $baseFontSize;
  static const double spacingMultiplier = $spacingMultiplier;
  static const String fontFamily = '$fontFamily';

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
          borderSide: BorderSide(color: primaryColor, width: 1.5),
        ),
        contentPadding: EdgeInsets.all(12.0 * spacingMultiplier),
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
''';
  }
}
