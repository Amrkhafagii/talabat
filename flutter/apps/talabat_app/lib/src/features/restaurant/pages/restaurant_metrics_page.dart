import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:intl/intl.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final restaurantMetricsProvider = FutureProvider.family<List<MetricPoint>, String>((ref, restaurantId) {
  return ref.watch(restaurantRepositoryProvider).fetchArrivalMetrics(restaurantId);
});

class RestaurantMetricsPage extends HookConsumerWidget {
  const RestaurantMetricsPage({super.key, this.restaurantIdOverride});

  final String? restaurantIdOverride;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final restaurantId = restaurantIdOverride ?? (auth.user?.appMetadata['restaurant_id'] as String?) ?? auth.user?.id;
    if (restaurantId == null) {
      return const Scaffold(body: Center(child: Text('Restaurant context missing')));
    }
    final metricsAsync = ref.watch(restaurantMetricsProvider(restaurantId));
    final formatter = DateFormat('EEE');
    useEffect(() {
      if (metricsAsync.hasValue) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ref.read(analyticsServiceProvider).logEvent('restaurant_metrics_viewed', parameters: {'points': metricsAsync.value?.length ?? 0});
        });
      }
      return null;
    }, [metricsAsync]);
    return Scaffold(
      appBar: AppBar(title: const Text('Arrival metrics')),
      body: metricsAsync.when(
        data: (points) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: [
            TalabatCard(
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('Bucket')),
                  DataColumn(label: Text('Trusted arrival %')),
                ],
                rows: points
                    .map(
                      (point) => DataRow(cells: [
                        DataCell(Text(formatter.format(point.label))),
                        DataCell(Text('${(point.value * 100).toStringAsFixed(1)}%')),
                      ]),
                    )
                    .toList(),
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load metrics: $err')),
      ),
    );
  }
}
