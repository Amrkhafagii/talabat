import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

class CashReconciliationPage extends ConsumerWidget {
  const CashReconciliationPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final driverId = authState.user?.appMetadata['driver_id'] as String? ?? authState.user?.id;
    if (driverId == null) {
      return const Scaffold(body: Center(child: Text('Driver profile missing')));
    }
    final entriesFuture = useMemoized(() => ref.watch(deliveryRepositoryProvider).fetchCashReconciliation(driverId));
    final entriesAsync = useFuture(entriesFuture);
    final formatter = NumberFormat.currency(symbol: 'EGP ');

    return Scaffold(
      appBar: AppBar(title: const Text('Cash Reconciliation')),
      body: entriesAsync.connectionState == ConnectionState.waiting
          ? const Center(child: CircularProgressIndicator())
          : entriesAsync.hasError
              ? Center(child: Text('Failed: ${entriesAsync.error}'))
              : ListView(
                  padding: EdgeInsets.all(TalabatColors.spacing.lg),
                  children: entriesAsync.data!
                      .map(
                        (entry) => TalabatCard(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Order ${entry.orderId.substring(0, 6)}'),
                              Text(formatter.format(entry.amount)),
                              Text(entry.status.toUpperCase()),
                            ],
                          ),
                        ),
                      )
                      .toList(),
                ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.all(TalabatColors.spacing.md),
        child: TalabatButton(
          label: 'Settle cash',
          onPressed: () => ref.read(deliveryRepositoryProvider).confirmCashSettlement(driverId, 0).then((_) {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cash settlement requested')));
          }),
        ),
      ),
    );
  }
}
