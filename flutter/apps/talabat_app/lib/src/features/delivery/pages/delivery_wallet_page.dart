import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

final driverWalletProvider = FutureProvider.family<WalletSummary, String>((ref, userId) {
  return ref.watch(deliveryRepositoryProvider).fetchDriverWallet(userId);
});

class DeliveryWalletPage extends HookConsumerWidget {
  const DeliveryWalletPage({super.key, this.userIdOverride});

  final String? userIdOverride;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final userId = userIdOverride ?? auth.user?.id;
    if (userId == null) {
      return const Scaffold(body: Center(child: Text('Driver not authenticated')));
    }
    final walletAsync = ref.watch(driverWalletProvider(userId));
    final noteController = useTextEditingController();
    final formatter = NumberFormat.currency(symbol: 'EGP ');

    Future<void> submitProof() async {
      final wallet = await ref.read(driverWalletProvider(userId).future);
      await ref
          .read(deliveryRepositoryProvider)
          .submitDriverPayoutProof(walletId: wallet.walletId, note: noteController.text.trim());
      ref.read(analyticsServiceProvider).logEvent('driver_payout_requested');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Proof submitted')));
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Driver wallet')),
      body: walletAsync.when(
        data: (summary) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: [
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Balance', style: Theme.of(context).textTheme.bodySmall),
                  Text(formatter.format(summary.balance), style: Theme.of(context).textTheme.displaySmall),
                  Text('Pending: ${formatter.format(summary.pending)}'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Recent transactions', style: Theme.of(context).textTheme.titleMedium),
                  ...summary.transactions.map((txn) => ListTile(
                        title: Text(txn.type),
                        subtitle: Text('${txn.status} • ${DateFormat.yMMMd().add_jm().format(txn.createdAt)}'),
                        trailing: Text(formatter.format(txn.amount)),
                      )),
                  TextField(controller: noteController, decoration: const InputDecoration(labelText: 'Proof notes')),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(onPressed: submitProof, child: const Text('Submit payout proof')),
                  ),
                ],
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load wallet: $err')),
      ),
    );
  }
}
