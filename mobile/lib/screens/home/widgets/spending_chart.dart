import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../core/app_theme.dart';
import '../../../core/api_service.dart';
import '../../../core/chart_utils.dart';
import '../../../core/custom_widgets.dart';

class SpendingChart extends StatefulWidget {
  const SpendingChart({super.key});

  @override
  State<SpendingChart> createState() => _SpendingChartState();
}

class _SpendingChartState extends State<SpendingChart> {
  String _selectedTimeframe = '7D';
  int? _showingTooltipSpot;
  List<dynamic> _chartData = [];

  @override
  void initState() {
    super.initState();
    _fetchChartData();
  }

  Future<void> _fetchChartData() async {
    final period = _selectedTimeframe.toLowerCase();
    final res = await ApiService.getChartData(period);
    if (mounted) {
      setState(() {
        if (res['success']) {
          _chartData = res['chartData'] ?? [];
        } else {
          _chartData = [];
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Use backend chart data fetched per-timeframe
    final List<FlSpot> spots;
    final int daysCount;

    if (_chartData.isNotEmpty) {
      daysCount = _chartData.length;
      spots = List.generate(_chartData.length, (i) {
        final val = double.tryParse(_chartData[i]['spent'].toString()) ?? 0.0;
        return FlSpot(i.toDouble(), val);
      });
    } else {
      // Placeholder: all zeros while loading or no data
      daysCount = _selectedTimeframe == '1M' ? 30 : _selectedTimeframe == '1Y' ? 365 : 7;
      spots = List.generate(daysCount, (i) => FlSpot(i.toDouble(), 0));
    }

    final spots2 = spots;

    // Calculate Y-axis scale based on actual data
    double maxSpending = 0;
    if (spots2.isNotEmpty) {
      maxSpending = spots2.map((e) => e.y).reduce((a, b) => a > b ? a : b);
    }

    final scale = ChartUtils.calculateNiceScale(maxSpending, 5);
    final double maxY = scale['maxY']!;
    final double interval = scale['interval']!;

    final barData = LineChartBarData(
      spots: spots2,
      isCurved: true,
      color: const Color(0xFF1E90FF),
      barWidth: 2,
      isStrokeCapRound: true,
      preventCurveOverShooting: true,
      dotData: const FlDotData(show: false),
      belowBarData: BarAreaData(
        show: true,
        color: const Color(0xFF1E90FF).withValues(alpha: 0.1),
      ),
    );

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.cardColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: context.glassShadow,
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Spending Overview',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              Row(
                children: ['7D', '1M', '1Y'].map((tf) {
                  bool isSelected = _selectedTimeframe == tf;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedTimeframe = tf;
                        _showingTooltipSpot = null;
                      });
                      _fetchChartData();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      margin: const EdgeInsets.only(left: 4),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF1E90FF) : context.subtleBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        tf,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : context.textSecondary,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                lineTouchData: LineTouchData(
                  handleBuiltInTouches: false,
                  touchCallback: (FlTouchEvent event, LineTouchResponse? touchResponse) {
                    if (event is FlTapUpEvent && touchResponse?.lineBarSpots != null && touchResponse!.lineBarSpots!.isNotEmpty) {
                      setState(() {
                        final spotIndex = touchResponse.lineBarSpots![0].spotIndex;
                        _showingTooltipSpot = spotIndex;
                      });
                    }
                  },
                  touchTooltipData: LineTouchTooltipData(
                    getTooltipColor: (touchedSpot) => const Color(0xFF1E90FF),
                    getTooltipItems: (touchedSpots) {
                      return touchedSpots.map((spot) {
                        return LineTooltipItem(
                          '₦${formatCurrency(spot.y)}',
                          const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        );
                      }).toList();
                    },
                  ),
                ),
                gridData: const FlGridData(show: false),
                titlesData: FlTitlesData(
                  show: true,
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 30,
                      interval: daysCount <= 7 ? 1 : (daysCount <= 30 ? 5 : 60),
                      getTitlesWidget: (value, meta) {
                        final idx = value.toInt();
                        if (idx < 0 || idx >= _chartData.length) return const Text('');
                        final label = _chartData[idx]['name']?.toString() ?? '';
                        return Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(label, style: const TextStyle(fontSize: 9, color: Colors.grey)),
                        );
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 44,
                      interval: interval,
                      getTitlesWidget: (value, meta) {
                        if (value == 0) return const Text('');
                        return Text('₦${ChartUtils.formatCompactValue(value)}', style: const TextStyle(fontSize: 9, color: Colors.grey));
                      },
                    ),
                  ),
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: (daysCount - 1).toDouble(),
                minY: 0,
                maxY: maxY,
                lineBarsData: [barData],
                showingTooltipIndicators: (_showingTooltipSpot != null && spots2.isNotEmpty && _showingTooltipSpot! < spots2.length)
                    ? [
                        ShowingTooltipIndicators([
                          LineBarSpot(barData, 0, barData.spots[_showingTooltipSpot!]),
                        ])
                      ]
                    : [],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
