import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:talabat_app/src/features/delivery/controllers/incident_queue_controller.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('delivery incident flow queues offline then flushes when online', (tester) async {
    final repo = _RecordingDeliveryRepository();
    final analytics = _SpyAnalytics();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          deliveryRepositoryProvider.overrideWithValue(repo),
          featureFlagsProvider.overrideWith((ref) async => const FeatureFlags(enableIncidentReporting: true)),
          analyticsServiceProvider.overrideWithValue(analytics),
        ],
        child: const _DeliveryIncidentHarness(),
      ),
    );

    await tester.pumpAndSettle();
    await tester.tap(find.text('Toggle offline'));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('log-incident-button')));
    await tester.pump();

    expect(repo.loggedIncidents, isEmpty, reason: 'incident queued while offline');
    expect(analytics.events, isEmpty);

    await tester.tap(find.text('Toggle offline'));
    await tester.pump();

    expect(repo.loggedIncidents.length, 1);
    expect(analytics.events.contains('delivery_incident_submitted'), isTrue);

    // Rebuild with feature flag disabled to ensure gating hides the entry point.
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          deliveryRepositoryProvider.overrideWithValue(repo),
          featureFlagsProvider.overrideWith((ref) async => const FeatureFlags(enableIncidentReporting: false)),
          analyticsServiceProvider.overrideWithValue(analytics),
        ],
        child: const _DeliveryIncidentHarness(),
      ),
    );

    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('log-incident-button')), findsNothing);
    expect(find.text('Incident reporting disabled'), findsOneWidget);
  });
}

class _DeliveryIncidentHarness extends HookConsumerWidget {
  const _DeliveryIncidentHarness();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final queue = ref.watch(incidentQueueControllerProvider);
    final flags = ref.watch(featureFlagsProvider);

    Future<void> toggleOffline() async {
      ref.read(incidentQueueControllerProvider.notifier).toggleOffline(!queue.offline);
    }

    Future<void> submitIncident() async {
      await ref
          .read(incidentQueueControllerProvider.notifier)
          .submitIncident(deliveryId: 'del-1', category: 'Delay', description: 'Traffic jam');
    }

    return MaterialApp(
      home: Scaffold(
        body: flags.when(
          data: (data) => Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('offline:${queue.offline} pending:${queue.pending.length}', key: const ValueKey('queue-state')),
                ElevatedButton(onPressed: toggleOffline, child: const Text('Toggle offline')),
                if (data.enableIncidentReporting)
                  ElevatedButton(
                    key: const ValueKey('log-incident-button'),
                    onPressed: submitIncident,
                    child: const Text('Log incident'),
                  )
                else
                  const Text('Incident reporting disabled'),
              ],
            ),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('Flags failed: $err')),
        ),
      ),
    );
  }
}

class _RecordingDeliveryRepository extends DeliveryRepository {
  _RecordingDeliveryRepository() : super(SupabaseClient('http://localhost', 'anon'));

  final List<Map<String, String>> loggedIncidents = [];

  @override
  Future<void> logIncident({required String deliveryId, required String category, required String description}) async {
    loggedIncidents.add({'deliveryId': deliveryId, 'category': category, 'description': description});
  }
}

class _SpyAnalytics extends AnalyticsService {
  _SpyAnalytics() : super.noop();

  final List<String> events = [];

  @override
  Future<void> logEvent(String name, {Map<String, dynamic>? parameters}) async {
    events.add(name);
  }

  @override
  Future<void> recordCrash({required Object error, StackTrace? stack, String? context}) async {}
}
