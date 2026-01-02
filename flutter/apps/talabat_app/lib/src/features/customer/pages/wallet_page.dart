import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

final walletSummaryProvider = FutureProvider<WalletSummary>((ref) async {
  final userId = ref.watch(authStateProvider).user?.id;
  if (userId == null) {
    throw Exception('Not authenticated');
  }
  return ref.watch(walletRepositoryProvider).fetchWalletSummary(userId);
});

class WalletPage extends HookConsumerWidget {
  const WalletPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletSummaryProvider);
    final formatter = NumberFormat.currency(symbol: 'EGP ');
    useEffect(() {
      if (walletAsync.hasError) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ref.read(analyticsServiceProvider).logEvent('wallet_error_toast', parameters: {'message': walletAsync.error.toString()});
        });
      }
      return null;
    }, [walletAsync]);

    return Scaffold(
      appBar: AppBar(title: const Text('Wallet & Instapay')),
      body: walletAsync.when(
        data: (summary) {
          final pending = summary.transactions.where((txn) => txn.status == 'pending').toList();
          return ListView(
            padding: EdgeInsets.all(TalabatColors.spacing.lg),
            children: [
              TalabatCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Available balance', style: Theme.of(context).textTheme.bodySmall),
                    Text(formatter.format(summary.balance), style: Theme.of(context).textTheme.displaySmall),
                    const SizedBox(height: 8),
                    Text('Pending: ${formatter.format(summary.pending)}'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              if (pending.isNotEmpty)
                TalabatCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Pending payouts', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      ...pending.map((txn) => Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(DateFormat.yMMMd().add_jm().format(txn.createdAt)),
                              Text('${txn.type} • ${txn.status}'),
                              Text(formatter.format(txn.amount)),
                            ],
                          )),
                      const SizedBox(height: 12),
                      TalabatButton(
                        label: 'Upload proof again',
                        variant: TalabatButtonVariant.secondary,
                        onPressed: () {
                          ref.read(analyticsServiceProvider).logEvent('wallet_proof_resubmitted');
                          context.push('/customer/payment-proof');
                        },
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 16),
              Text('Recent activity', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...summary.transactions.map(
                (txn) => ListTile(
                  title: Text('${txn.type} - ${formatter.format(txn.amount)}'),
                  subtitle: Text('${txn.status} • ${DateFormat.yMMMd().add_jm().format(txn.createdAt)}'),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text(err.toString())),
      ),
    );
  }
}
