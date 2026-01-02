import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:talabat_app/src/features/customer/pages/wallet_page.dart';

void main() {
  testWidgets('wallet pending payouts surface manual proof action', (tester) async {
    final analytics = _SpyAnalytics();
    final summary = WalletSummary(
      walletId: 'w-1',
      balance: 200,
      pending: 50,
      transactions: [
        WalletTransaction(amount: 50, type: 'payout', status: 'pending', createdAt: DateTime(2024, 6, 1)),
        WalletTransaction(amount: -20, type: 'order', status: 'posted', createdAt: DateTime(2024, 5, 1)),
      ],
    );

    final router = GoRouter(routes: [
      GoRoute(path: '/', builder: (context, state) => const WalletPage()),
      GoRoute(path: '/customer/payment-proof', builder: (context, state) => const Placeholder()),
    ]);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          walletSummaryProvider.overrideWith((ref) => AsyncValue.data(summary)),
          analyticsServiceProvider.overrideWithValue(analytics),
          locationControllerProvider.overrideWith((ref) => LocationController()),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );

    await tester.pump();
    expect(find.text('Pending payouts'), findsOneWidget);
    await tester.tap(find.text('Upload proof again'));
    await tester.pump();
    expect(analytics.events.contains('wallet_proof_resubmitted'), isTrue);
  });
}

class _SpyAnalytics extends AnalyticsService {
  _SpyAnalytics() : super.noop();

  final List<String> events = [];

  @override
  Future<void> logEvent(String name, {Map<String, dynamic>? parameters}) async {
    events.add(name);
  }
}
