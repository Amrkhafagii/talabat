import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final deliveryHistoryProvider = FutureProvider.family<List<DeliveryHistoryEntry>, String>((ref, driverId) {
  return ref.watch(deliveryRepositoryProvider).fetchDeliveryHistory(driverId);
});

class DeliveryHistoryPage extends ConsumerWidget {
  const DeliveryHistoryPage({super.key, this.driverIdOverride});

  final String? driverIdOverride;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final driverId = driverIdOverride ?? (auth.user?.appMetadata['driver_id'] as String? ?? auth.user?.id);
    if (driverId == null) {
      return const Scaffold(body: Center(child: Text('Driver profile missing')));
    }
    final historyAsync = ref.watch(deliveryHistoryProvider(driverId));
    final formatter = NumberFormat.currency(symbol: 'EGP ');

    return Scaffold(
      appBar: AppBar(title: const Text('Delivery history')),
      body: historyAsync.when(
        data: (entries) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: entries
              .map(
                (entry) => TalabatCard(
                  child: ListTile(
                    title: Text('Order ${entry.id.substring(0, 6)}'),
                    subtitle: Text('${entry.status} • ${DateFormat.yMMMd().format(entry.completedAt)}'),
                    trailing: Text(formatter.format(entry.total)),
                  ),
                ),
              )
              .toList(),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Unable to load history: $err')),
      ),
    );
  }
}
