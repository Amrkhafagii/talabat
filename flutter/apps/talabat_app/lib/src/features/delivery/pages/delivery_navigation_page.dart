import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

class DeliveryNavigationPage extends HookConsumerWidget {
  const DeliveryNavigationPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final driverId = authState.user?.appMetadata['driver_id'] as String? ?? authState.user?.id;
    final jobFuture = useMemoized(() => ref.watch(deliveryRepositoryProvider).fetchActiveDelivery(driverId ?? ''));
    final jobAsync = useFuture(jobFuture);

    return Scaffold(
      appBar: AppBar(title: const Text('Navigation')),
      body: jobAsync.connectionState == ConnectionState.waiting
          ? const Center(child: CircularProgressIndicator())
          : jobAsync.hasError
              ? Center(child: Text('Failed: ${jobAsync.error}'))
              : jobAsync.data == null
                  ? const Center(child: Text('No active deliveries'))
                  : _DeliveryDetails(job: jobAsync.data!),
      bottomNavigationBar: driverId == null
          ? null
          : Padding(
              padding: EdgeInsets.all(TalabatColors.spacing.md),
              child: TalabatButton(
                label: 'Report issue',
                onPressed: jobAsync.data == null ? null : () => context.push('/delivery/incident/${jobAsync.data!.id}'),
              ),
            ),
    );
  }
}

class _DeliveryDetails extends ConsumerWidget {
  const _DeliveryDetails({required this.job});

  final DeliveryJob job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: EdgeInsets.all(TalabatColors.spacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TalabatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Pickup', style: Theme.of(context).textTheme.bodySmall),
                Text(job.pickupAddress, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                Text('Drop-off', style: Theme.of(context).textTheme.bodySmall),
                Text(job.dropoffAddress, style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
          ),
          const SizedBox(height: 24),
          TalabatButton(
            label: 'Open pickup in Maps',
            onPressed: job.pickupLat == null ? null : () => _openMap(job.pickupLat!, job.pickupLng!),
          ),
          const SizedBox(height: 12),
          TalabatButton(
            label: 'Open drop-off in Maps',
            onPressed: job.dropoffLat == null ? null : () => _openMap(job.dropoffLat!, job.dropoffLng!),
          ),
          const SizedBox(height: 24),
          TalabatButton(
            label: 'Mark picked up',
            onPressed: job.status == 'assigned'
                ? () => ref.read(deliveryRepositoryProvider).updateDeliveryStatus(job.id, 'picked_up')
                : null,
          ),
          TalabatButton(
            label: 'Mark delivered',
            onPressed: job.status == 'picked_up' || job.status == 'on_the_way'
                ? () => ref.read(deliveryRepositoryProvider).updateDeliveryStatus(job.id, 'delivered')
                : null,
          ),
        ],
      ),
    );
  }

  Future<void> _openMap(double lat, double? lng) async {
    final uri = Uri.parse('https://maps.google.com/maps?q=$lat,${lng ?? 0}');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
