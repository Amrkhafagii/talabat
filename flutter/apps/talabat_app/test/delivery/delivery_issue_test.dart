import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:talabat_app/src/features/delivery/controllers/incident_queue_controller.dart';
import 'package:talabat_app/src/features/delivery/pages/delivery_issue_sheet.dart';
import 'package:talabat_app/src/features/delivery/pages/delivery_profile_page.dart';

void main() {
  testWidgets('issue sheet queues incident while offline', (tester) async {
    final repo = _FakeDeliveryRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          deliveryRepositoryProvider.overrideWithValue(repo),
          incidentQueueControllerProvider.overrideWith((ref) {
            final controller = IncidentQueueController(ref);
            controller.toggleOffline(true);
            return controller;
          }),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: Scaffold(body: SizedBox.shrink())),
      ),
    );

    final rootContext = tester.element(find.byType(SizedBox));
    await showDeliveryIssueSheet(rootContext, deliveryId: 'del-1');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Safety'));
    await tester.enterText(find.byType(TextField).last, 'Helmet issue');
    await tester.tap(find.text('Submit'));
    await tester.pump();
    final container = ProviderScope.containerOf(rootContext);
    final queue = container.read(incidentQueueControllerProvider);
    expect(queue.pending, isNotEmpty);
    expect(queue.pending.first.category, 'Safety');
  });

  testWidgets('profile toggle updates availability', (tester) async {
    final repo = _FakeDeliveryRepository();
    repo.profile = const DriverProfile(
      driverId: 'driver-1',
      name: 'Rami',
      vehicle: 'Bike',
      available: false,
      documents: [DriverDocument(name: 'License', status: 'approved')],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          deliveryRepositoryProvider.overrideWithValue(repo),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: DeliveryProfilePage(driverIdOverride: 'driver-1')),
      ),
    );

    await tester.pump();
    await tester.tap(find.byType(SwitchListTile));
    await tester.pump();
    expect(repo.availabilityUpdated, isTrue);
  });

  testWidgets('incident queue flushes after reconnect', (tester) async {
    final repo = _FakeDeliveryRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          deliveryRepositoryProvider.overrideWithValue(repo),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: Scaffold(body: SizedBox.shrink())),
      ),
    );

    final context = tester.element(find.byType(SizedBox));
    final container = ProviderScope.containerOf(context);
    final controller = container.read(incidentQueueControllerProvider.notifier);

    controller.toggleOffline(true);
    await controller.submitIncident(deliveryId: '123', category: 'Delay', description: 'Traffic');
    expect(container.read(incidentQueueControllerProvider).pending.length, 1);

    controller.toggleOffline(false);
    await tester.pump();
    expect(repo.loggedIncidents, isNotEmpty);
    expect(container.read(incidentQueueControllerProvider).pending, isEmpty);
  });
}

class _FakeDeliveryRepository extends DeliveryRepository {
  _FakeDeliveryRepository() : super(SupabaseClient('http://localhost', 'anon'));

  bool availabilityUpdated = false;
  final List<PendingIncident> loggedIncidents = [];
  DriverProfile profile = const DriverProfile(driverId: 'driver-1', name: 'N/A', vehicle: '', available: true, documents: []);

  @override
  Future<void> logIncident({required String deliveryId, required String category, required String description}) async {
    loggedIncidents.add(PendingIncident(deliveryId: deliveryId, category: category, description: description));
  }

  @override
  Future<DriverProfile> fetchProfile(String driverId) async => profile;

  @override
  Future<void> updateAvailability(String driverId, bool available) async {
    availabilityUpdated = available;
  }
}
