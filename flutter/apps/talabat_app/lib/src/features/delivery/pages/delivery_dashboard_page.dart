import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../controllers/incident_queue_controller.dart';
import 'delivery_issue_sheet.dart';

class DeliveryDashboardPage extends ConsumerWidget {
  const DeliveryDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final driverId = authState.user?.appMetadata['driver_id'] as String? ?? authState.user?.id;
    final flagsAsync = ref.watch(featureFlagsProvider);
    final incidentState = ref.watch(incidentQueueControllerProvider);
    if (driverId == null) {
      return const Scaffold(body: Center(child: Text('Driver profile missing')));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Delivery Hub'),
        actions: [IconButton(onPressed: () => context.push('/delivery/navigation'), icon: const Icon(Icons.navigation))],
      ),
      body: ListView(
        padding: EdgeInsets.all(TalabatColors.spacing.lg),
        children: [
          TalabatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Next steps'),
                const SizedBox(height: 8),
                TalabatButton(label: 'Go online & track delivery', onPressed: () => context.push('/delivery/navigation')),
                const SizedBox(height: 8),
                TalabatButton(label: 'Cash reconciliation', onPressed: () => context.push('/delivery/cash')),
                const SizedBox(height: 8),
                TalabatButton(label: 'Earnings summary', onPressed: () => context.push('/delivery/earnings')),
                const SizedBox(height: 8),
                TalabatButton(label: 'Delivery history', variant: TalabatButtonVariant.secondary, onPressed: () => context.push('/delivery/history')),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TalabatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: incidentState.offline,
                  onChanged: (value) => ref.read(incidentQueueControllerProvider.notifier).toggleOffline(value),
                  title: const Text('Offline incident queue'),
                  subtitle: Text('${incidentState.pending.length} pending reports'),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => showDeliveryIssueSheet(context, deliveryId: 'active'),
                    child: const Text('Report incident'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          flagsAsync.when(
            data: (flags) => flags.enableIncidentReporting
                ? TalabatCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('Safety first'),
                        SizedBox(height: 4),
                        Text('Use the report button on navigation screens whenever you see an incident.'),
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 12),
          TalabatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Profile & wallet'),
                TextButton(onPressed: () => context.push('/delivery/profile'), child: const Text('Driver profile')),
                TextButton(onPressed: () => context.push('/delivery/wallet'), child: const Text('Wallet & payouts')),
                TextButton(onPressed: () => context.push('/delivery/feedback'), child: const Text('Send feedback')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
