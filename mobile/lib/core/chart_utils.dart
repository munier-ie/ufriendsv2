import 'dart:math';

class ChartUtils {
  /// Calculates a "nice" scale for chart axes.
  /// Returns a map with 'maxY' and 'interval'.
  static Map<String, double> calculateNiceScale(double maxVal, int desiredTicks) {
    if (maxVal <= 0) {
      // No data: show a clean flat scale so the chart doesn't look broken
      return {'maxY': 100.0, 'interval': 25.0};
    }

    double range = maxVal;
    double roughSpacing = range / (desiredTicks - 1);
    
    // Find the power of 10
    double power = (log(roughSpacing) / ln10).floorToDouble();
    double fraction = roughSpacing / pow(10, power);

    // Find the nice fraction
    double niceFraction;
    if (fraction <= 1.0) {
      niceFraction = 1.0;
    } else if (fraction <= 2.0) {
      niceFraction = 2.0;
    } else if (fraction <= 5.0) {
      niceFraction = 5.0;
    } else {
      niceFraction = 10.0;
    }

    double interval = niceFraction * pow(10, power);
    
    // Calculate maxY as a multiple of interval
    double maxY = (maxVal / interval).ceil() * interval;

    // Add padding (at least 10-20%)
    // If maxY is exactly maxVal or very close, add another interval
    if (maxY - maxVal < maxVal * 0.1) {
      maxY += interval;
    }

    return {'maxY': maxY, 'interval': interval};
  }

  /// Formats a value compactly (e.g., 1.2K, 1.5M).
  static String formatCompactValue(double value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '')}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1).replaceAll(RegExp(r'\.0$'), '')}K';
    }
    return value.toStringAsFixed(0);
  }
}
