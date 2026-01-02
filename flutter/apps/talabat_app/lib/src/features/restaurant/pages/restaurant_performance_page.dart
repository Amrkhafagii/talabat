import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final restaurantPerformanceProvider = FutureProvider.family<RestaurantPerformanceSummary, String>((ref, restaurantId) {
  return ref.watch(restaurantRepositoryProvider).fetchPerformanceSummary(restaurantId);
});

class RestaurantPerformancePage extends ConsumerWidget {
  const RestaurantPerformancePage({super.key, this.restaurantIdOverride});

  final String? restaurantIdOverride;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final restaurantId = restaurantIdOverride ?? (auth.user?.appMetadata['restaurant_id'] as String?) ?? auth.user?.id;
    if (restaurantId == null) {
      return const Scaffold(body: Center(child: Text('Restaurant context missing')));
    }
    final summaryAsync = ref.watch(restaurantPerformanceProvider(restaurantId));
    return Scaffold(
      appBar: AppBar(title: const Text('Performance overview')),
      body: summaryAsync.when(
        data: (summary) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: [
            _MetricRow(
              metrics: [
                _MetricTile(label: 'Fulfillment rate', value: '${(summary.fulfillmentRate * 100).toStringAsFixed(1)}%'),
                _MetricTile(label: 'Avg prep', value: '${summary.averagePrepMinutes.toStringAsFixed(0)} min'),
                _MetricTile(label: 'Orders today', value: summary.ordersToday.toString()),
              ],
            ),
            const SizedBox(height: 24),
            Text('Trusted arrival trend', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            TalabatCard(child: _TrendChart(points: summary.trustedArrivalTrend)),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load: $err')),
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  const _MetricRow({required this.metrics});

  final List<_MetricTile> metrics;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      if (constraints.maxWidth < 600) {
        return Column(
          children: metrics
              .map((metric) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: metric,
                  ))
              .toList(),
        );
      }
      return Row(
        children: metrics
            .map((metric) => Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: metric,
                  ),
                ))
            .toList(),
      );
    });
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return TalabatCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          Text(value, style: Theme.of(context).textTheme.displaySmall),
        ],
      ),
    );
  }
}

class _TrendChart extends StatelessWidget {
  const _TrendChart({required this.points});

  final List<MetricPoint> points;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const SizedBox(height: 160, child: Center(child: Text('No data yet')));
    }
    final minValue = points.map((p) => p.value).reduce((a, b) => a < b ? a : b);
    final maxValue = points.map((p) => p.value).reduce((a, b) => a > b ? a : b);
    return SizedBox(
      height: 180,
      child: CustomPaint(
        painter: _TrendPainter(points: points, minValue: minValue, maxValue: maxValue),
      ),
    );
  }
}

class _TrendPainter extends CustomPainter {
  _TrendPainter({required this.points, required this.minValue, required this.maxValue});

  final List<MetricPoint> points;
  final double minValue;
  final double maxValue;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.orange
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;
    final path = Path();
    for (var i = 0; i < points.length; i++) {
      final x = size.width * (i / (points.length - 1));
      final normalized = maxValue == minValue ? 0.5 : (points[i].value - minValue) / (maxValue - minValue);
      final y = size.height - (normalized * size.height);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
