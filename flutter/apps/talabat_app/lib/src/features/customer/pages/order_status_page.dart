import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

class OrderStatusPage extends ConsumerWidget {
  const OrderStatusPage({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orderState = ref.watch(orderStatusProvider(orderId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Status'),
        actions: [
          TextButton(
            onPressed: () => context.push('/customer/payment-proof?orderId=$orderId'),
            child: const Text('Upload proof'),
          ),
        ],
      ),
      body: orderState.when(
        data: (state) {
          if (state.loading) {
            return const Center(child: CircularProgressIndicator());
          }
          return Padding(
            padding: EdgeInsets.all(TalabatColors.spacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TalabatCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(state.restaurantName ?? '', style: Theme.of(context).textTheme.titleMedium),
                      Text('Status: ${state.status}', style: Theme.of(context).textTheme.bodyMedium),
                      if (state.eta != null)
                        Text('ETA: ${state.eta!.etaLowMinutes}-${state.eta!.etaHighMinutes} min',
                            style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Expanded(
                  child: ListView.builder(
                    itemCount: state.timelineLabels.length,
                    itemBuilder: (context, index) {
                      final label = state.timelineLabels[index];
                      final isDone = index <= state.timelineIndex;
                      return ListTile(
                        leading: Icon(isDone ? Icons.check_circle : Icons.radio_button_unchecked,
                            color: isDone ? Theme.of(context).colorScheme.primary : null),
                        title: Text(label.replaceAll('_', ' ').toUpperCase()),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                TalabatButton(
                  label: 'Track driver',
                  onPressed: state.driverLocation == null
                      ? null
                      : () async {
                          await ref.read(analyticsServiceProvider).logEvent('track_driver', parameters: {'order_id': orderId});
                          _openInMaps(state.driverLocation!.latitude, state.driverLocation!.longitude);
                        },
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text(err.toString())),
      ),
    );
  }

  Future<void> _openInMaps(double lat, double lng) async {
    final uri = Uri.parse('https://www.google.com/maps?q=$lat,$lng');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
