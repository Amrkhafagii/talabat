import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

final restaurantOrderDetailProvider = FutureProvider.family<RestaurantOrderDetail, String>((ref, orderId) {
  return ref.watch(restaurantRepositoryProvider).fetchOrderDetail(orderId);
});

class RestaurantOrderDetailPage extends ConsumerWidget {
  const RestaurantOrderDetailPage({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderAsync = ref.watch(restaurantOrderDetailProvider(orderId));
    final formatter = NumberFormat.currency(symbol: 'EGP ');

    Future<void> trigger(String action) async {
      try {
        await ref.read(restaurantRepositoryProvider).performOrderAction(orderId: orderId, action: action);
        await ref.read(analyticsServiceProvider).logEvent('restaurant_order_action', parameters: {'action': action});
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action $action sent')));
          ref.invalidate(restaurantOrderDetailProvider(orderId));
        }
      } catch (err) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $err')));
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text('Order $orderId')),
      body: orderAsync.when(
        data: (order) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: [
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Timeline', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  ...order.timeline.map((entry) => ListTile(
                        leading: Icon(entry.completed ? Icons.check_circle : Icons.radio_button_unchecked),
                        title: Text(entry.label),
                        subtitle: Text(entry.timestamp != null ? DateFormat.Hm().format(entry.timestamp!) : 'Pending'),
                      )),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Customer', style: Theme.of(context).textTheme.titleMedium),
                  Text(order.customerName),
                  Text(order.customerPhone),
                  if (order.driverName != null) ...[
                    const SizedBox(height: 12),
                    Text('Driver', style: Theme.of(context).textTheme.titleMedium),
                    Text(order.driverName!),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Items', style: Theme.of(context).textTheme.titleMedium),
                  ...order.items.map((item) => ListTile(
                        title: Text(item.name),
                        trailing: Text('x${item.quantity}'),
                      )),
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text('Total: ${formatter.format(order.total)}', style: Theme.of(context).textTheme.titleMedium),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TalabatButton(
                    label: 'Hold order',
                    variant: TalabatButtonVariant.secondary,
                    onPressed: () => trigger('hold'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(child: TalabatButton(label: 'Capture payment', onPressed: () => trigger('capture'))),
              ],
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load order: $err')),
      ),
    );
  }
}
