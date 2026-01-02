import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

final adminPayoutsProvider = FutureProvider<List<AdminPayoutRow>>((ref) {
  return ref.watch(adminRepositoryProvider).fetchPayouts();
});

class AdminPayoutsPage extends ConsumerWidget {
  const AdminPayoutsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payoutsAsync = ref.watch(adminPayoutsProvider);
    final formatter = NumberFormat.currency(symbol: 'EGP ');

    return Scaffold(
      appBar: AppBar(title: const Text('Payout reviews')),
      body: payoutsAsync.when(
        data: (rows) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: rows
              .map(
                (row) => TalabatCard(
                  child: ListTile(
                    title: Text(row.userName),
                    subtitle: Text(row.status),
                    trailing: Text(formatter.format(row.amount)),
                    onTap: () => _review(context, ref, row.id, true),
                    onLongPress: () => _review(context, ref, row.id, false),
                  ),
                ),
              )
              .toList(),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed: $err')),
      ),
    );
  }

  Future<void> _review(BuildContext context, WidgetRef ref, String payoutId, bool approve) async {
    await ref.read(adminRepositoryProvider).reviewPayout(payoutId, approve);
    await ref.read(analyticsServiceProvider).logEvent('admin_payout_reviewed', parameters: {'approved': approve});
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(approve ? 'Approved' : 'Rejected')));
      ref.invalidate(adminPayoutsProvider);
    }
  }
}
