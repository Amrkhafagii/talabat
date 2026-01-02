import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final adminOrdersProvider = FutureProvider<List<AdminOrderRow>>((ref) {
  return ref.watch(adminRepositoryProvider).fetchOrders();
});

class AdminOrdersPage extends HookConsumerWidget {
  const AdminOrdersPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(adminOrdersProvider);
    final filter = useState<String>('all');

    return Scaffold(
      appBar: AppBar(title: const Text('Orders triage')),
      body: ordersAsync.when(
        data: (orders) {
          final filtered = filter.value == 'all' ? orders : orders.where((order) => order.status == filter.value).toList();
          return ListView(
            padding: EdgeInsets.all(TalabatColors.spacing.lg),
            children: [
              Wrap(
                spacing: 8,
                children: ['all', 'pending', 'delayed']
                    .map((status) => ChoiceChip(
                          label: Text(status.toUpperCase()),
                          selected: filter.value == status,
                          onSelected: (_) => filter.value = status,
                        ))
                    .toList(),
              ),
              const SizedBox(height: 12),
              ...filtered.map((order) => TalabatCard(
                    child: ListTile(
                      title: Text('Order ${order.id.substring(0, 6)}'),
                      subtitle: Text('${order.customerName} • SLA ${order.slaMinutes} min'),
                      trailing: PopupMenuButton<String>(
                        onSelected: (action) => _performAction(context, ref, order.id, action),
                        itemBuilder: (context) => const [
                          PopupMenuItem(value: 'reroute', child: Text('Reroute')),
                          PopupMenuItem(value: 'refund', child: Text('Refund')),
                        ],
                      ),
                    ),
                  )),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed: $err')),
      ),
    );
  }

  Future<void> _performAction(BuildContext context, WidgetRef ref, String orderId, String action) async {
    await ref.read(adminRepositoryProvider).performAdminOrderAction(orderId: orderId, action: action);
    await ref.read(analyticsServiceProvider).logEvent('admin_order_action', parameters: {'action': action});
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action $action sent')));
      ref.invalidate(adminOrdersProvider);
    }
  }
}
