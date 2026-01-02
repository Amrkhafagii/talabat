import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:talabat_app/src/features/customer/pages/checkout_page.dart';

void main() {
  testWidgets('checkout uses selected default address', (tester) async {
    final locationController = LocationController();
    await locationController.setSelectedAddress(
      const UserAddress(id: 'addr-1', label: 'Home', addressLine1: 'Line 42', isDefault: true),
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          locationControllerProvider.overrideWith((ref) => locationController),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: CheckoutPage()),
      ),
    );

    expect(find.text('Line 42'), findsOneWidget);
    expect(find.text('Change'), findsOneWidget);
  });
}
