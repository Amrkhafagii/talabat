import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:talabat_app/src/features/delivery/pages/delivery_wallet_page.dart';

void main() {
  testWidgets('delivery wallet proof submission hits repository + analytics', (tester) async {
    final repo = _FakeDeliveryRepository();
    final analytics = _SpyAnalytics();
    final summary = WalletSummary(
      walletId: 'wallet-1',
      balance: 150,
      pending: 25,
      transactions: [
        WalletTransaction(amount: 25, type: 'payout', status: 'pending', createdAt: DateTime(2024, 5, 1)),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          deliveryRepositoryProvider.overrideWithValue(repo),
          driverWalletProvider.overrideWith((ref, userId) => AsyncValue.data(summary)),
          analyticsServiceProvider.overrideWithValue(analytics),
        ],
        child: const MaterialApp(home: DeliveryWalletPage(userIdOverride: 'driver-1')),
      ),
    );

    await tester.pump();
    await tester.enterText(find.byType(TextField), 'Need manual approval');
    await tester.tap(find.text('Submit payout proof'));
    await tester.pump();

    expect(repo.lastProofNote, 'Need manual approval');
    expect(analytics.events.contains('driver_payout_requested'), isTrue);
  });
}

class _FakeDeliveryRepository extends DeliveryRepository {
  _FakeDeliveryRepository() : super(SupabaseClient('http://localhost', 'anon'));

  String? lastProofNote;

  @override
  Future<WalletSummary> fetchDriverWallet(String userId) async {
    throw UnimplementedError('fetchDriverWallet overridden via provider');
  }

  @override
  Future<void> submitDriverPayoutProof({required String walletId, required String note}) async {
    lastProofNote = note;
  }
}

class _SpyAnalytics extends AnalyticsService {
  _SpyAnalytics() : super.noop();

  final List<String> events = [];

  @override
  Future<void> logEvent(String name, {Map<String, dynamic>? parameters}) async {
    events.add(name);
  }
}
