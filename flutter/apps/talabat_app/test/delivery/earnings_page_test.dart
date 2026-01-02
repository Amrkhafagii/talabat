import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:talabat_app/src/features/delivery/pages/delivery_earnings_page.dart';

void main() {
  testWidgets('earnings page renders ledger entries', (tester) async {
    final summary = EarningsSummary(
      weekTotal: 500,
      pendingPayouts: 120,
      entries: [
        LifetimeLedgerEntry(label: 'Order 1', amount: 100, createdAt: DateTime(2024, 1, 1)),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          driverEarningsProvider.overrideWithProvider((driverId) => Provider((ref) => AsyncValue.data(summary))),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: DeliveryEarningsPage(driverIdOverride: 'driver-1')),
      ),
    );

    await tester.pump();
    expect(find.textContaining('This week'), findsOneWidget);
    expect(find.text('Order 1'), findsOneWidget);
  });
}
