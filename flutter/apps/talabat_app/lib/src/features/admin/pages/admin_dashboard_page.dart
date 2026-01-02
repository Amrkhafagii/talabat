import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

final adminTotalsProvider = FutureProvider<AdminTotals>((ref) => ref.watch(adminRepositoryProvider).fetchTotals());
final adminQueueProvider = FutureProvider<AdminQueueCounts>((ref) => ref.watch(adminRepositoryProvider).fetchQueueCounts());
final adminDriverProfitProvider = FutureProvider<List<ProfitBreakdown>>((ref) => ref.watch(adminRepositoryProvider).fetchDriverProfit());
final adminRestaurantProfitProvider = FutureProvider<List<ProfitBreakdown>>((ref) => ref.watch(adminRepositoryProvider).fetchRestaurantProfit());

class AdminDashboardPage extends HookConsumerWidget {
  const AdminDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final totals = ref.watch(adminTotalsProvider);
    final queues = ref.watch(adminQueueProvider);
    final driverProfit = ref.watch(adminDriverProfitProvider);
    final restaurantProfit = ref.watch(adminRestaurantProfitProvider);
    final flagAsync = ref.watch(featureFlagsProvider);
    final walletUserController = useTextEditingController();
    final exportState = useState<String?>(null);
    final formatter = NumberFormat.currency(symbol: 'EGP ');

    Future<void> exportWallet() async {
      try {
        final userId = walletUserController.text.trim();
        if (userId.isEmpty) {
          exportState.value = 'Enter a user id';
          return;
        }
        final rows = await ref.read(adminRepositoryProvider).fetchWalletTransactions(userId);
        final buffer = StringBuffer('wallet_id,amount,type,status,created_at\\n');
        for (final row in rows) {
          buffer.writeln('${row['wallet_id']},${row['amount']},${row['type']},${row['status']},${row['created_at']}');
        }
        await Clipboard.setData(ClipboardData(text: buffer.toString()));
        exportState.value = 'Copied ${rows.length} rows to clipboard.';
      } catch (err) {
        exportState.value = 'Export failed: $err';
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Console'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (route) => context.push(route),
            itemBuilder: (context) => const [
              PopupMenuItem(value: '/admin/orders', child: Text('Orders triage')),
              PopupMenuItem(value: '/admin/payouts', child: Text('Payout reviews')),
              PopupMenuItem(value: '/admin/reviews', child: Text('Content reviews')),
              PopupMenuItem(value: '/admin/settings', child: Text('Feature flags')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(adminTotalsProvider);
          ref.invalidate(adminQueueProvider);
          ref.invalidate(adminDriverProfitProvider);
          ref.invalidate(adminRestaurantProfitProvider);
        },
        child: ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: [
            totals.when(
              data: (totals) => _MetricRow(
                metrics: [
                  _MetricTile(label: 'Total customer paid', value: formatter.format(totals.totalCustomerPaid)),
                  _MetricTile(label: 'Platform fee', value: formatter.format(totals.platformFee)),
                  _MetricTile(label: 'Paid orders', value: totals.paidOrders.toString()),
                ],
              ),
              loading: () => const TalabatSkeleton.rect(height: 120),
              error: (err, _) => Text(err.toString()),
            ),
            const SizedBox(height: 16),
            queues.when(
              data: (queue) => TalabatCard(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _QueueBadge(label: 'Payment review', count: queue.paymentReview),
                    _QueueBadge(label: 'Photo review', count: queue.photoReview),
                    _QueueBadge(label: 'Support', count: queue.support),
                  ],
                ),
              ),
              loading: () => const TalabatSkeleton.rect(height: 80),
              error: (err, _) => Text(err.toString()),
            ),
            const SizedBox(height: 24),
            Text('Top driver profit', style: Theme.of(context).textTheme.titleMedium),
            driverProfit.when(
              data: (rows) => Column(
                children: rows
                    .take(5)
                    .map((row) => ListTile(
                          leading: const Icon(Icons.delivery_dining),
                          title: Text(row.name),
                          subtitle: Text(row.email ?? ''),
                          trailing: Text(formatter.format(row.value)),
                        ))
                    .toList(),
              ),
              loading: () => const TalabatSkeleton.rect(height: 120),
              error: (err, _) => Text(err.toString()),
            ),
            const SizedBox(height: 24),
            Text('Top restaurant profit', style: Theme.of(context).textTheme.titleMedium),
            restaurantProfit.when(
              data: (rows) => Column(
                children: rows
                    .take(5)
                    .map((row) => ListTile(
                          leading: const Icon(Icons.restaurant),
                          title: Text(row.name),
                          subtitle: Text(row.email ?? ''),
                          trailing: Text(formatter.format(row.value)),
                        ))
                    .toList(),
              ),
              loading: () => const TalabatSkeleton.rect(height: 120),
              error: (err, _) => Text(err.toString()),
            ),
            const SizedBox(height: 24),
            flagAsync.when(
              data: (flags) => flags.enableAdminExports
                  ? TalabatCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Wallet transactions export', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 8),
                          TextField(
                            controller: walletUserController,
                            decoration: const InputDecoration(labelText: 'User ID', border: OutlineInputBorder()),
                          ),
                          const SizedBox(height: 12),
                          TalabatButton(label: 'Copy CSV', onPressed: exportWallet),
                          if (exportState.value != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(exportState.value!, style: Theme.of(context).textTheme.bodySmall),
                            ),
                        ],
                      ),
                    )
                  : const SizedBox.shrink(),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  const _MetricRow({required this.metrics});

  final List<_MetricTile> metrics;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 600) {
          return Column(
            children: metrics.map((metric) => Padding(padding: const EdgeInsets.only(bottom: 12), child: metric)).toList(),
          );
        }
        return Row(
          children: metrics
              .map(
                (metric) => Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: metric,
                  ),
                ),
              )
              .toList(),
        );
      },
    );
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

class _QueueBadge extends StatelessWidget {
  const _QueueBadge({required this.label, required this.count});

  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(count.toString(), style: Theme.of(context).textTheme.displaySmall),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
