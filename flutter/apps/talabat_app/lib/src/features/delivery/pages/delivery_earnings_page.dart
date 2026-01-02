import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:intl/intl.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final driverEarningsProvider = FutureProvider.family<EarningsSummary, String>((ref, driverId) {
  return ref.watch(deliveryRepositoryProvider).fetchEarningsSummary(driverId);
});

class DeliveryEarningsPage extends HookConsumerWidget {
  const DeliveryEarningsPage({super.key, this.driverIdOverride});

  final String? driverIdOverride;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final driverId = driverIdOverride ?? (auth.user?.appMetadata['driver_id'] as String? ?? auth.user?.id);
    if (driverId == null) {
      return const Scaffold(body: Center(child: Text('Driver profile missing')));
    }
    final earningsAsync = ref.watch(driverEarningsProvider(driverId));
    final formatter = NumberFormat.currency(symbol: 'EGP ');
    useEffect(() {
      if (earningsAsync.hasValue) {
        ref.read(analyticsServiceProvider).logEvent('delivery_earnings_viewed');
      }
      return null;
    }, [earningsAsync]);

    return Scaffold(
      appBar: AppBar(title: const Text('Earnings summary')),
      body: earningsAsync.when(
        data: (summary) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: [
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('This week', style: Theme.of(context).textTheme.bodySmall),
                  Text(formatter.format(summary.weekTotal), style: Theme.of(context).textTheme.displaySmall),
                  Text('Pending payouts: ${formatter.format(summary.pendingPayouts)}'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Ledger', style: Theme.of(context).textTheme.titleMedium),
                  ...summary.entries.map((entry) => ListTile(
                        title: Text(entry.label),
                        subtitle: Text(DateFormat.yMMMd().format(entry.createdAt)),
                        trailing: Text(formatter.format(entry.amount)),
                      )),
                ],
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to fetch earnings: $err')),
      ),
    );
  }
}
