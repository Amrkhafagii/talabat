import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:talabat_app/src/features/admin/pages/admin_dashboard_page.dart';
import 'package:talabat_app/src/features/admin/pages/admin_orders_page.dart';
import 'package:talabat_app/src/features/admin/pages/admin_payouts_page.dart';
import 'package:talabat_app/src/features/admin/pages/admin_reviews_page.dart';
import 'package:talabat_app/src/features/admin/pages/admin_settings_page.dart';

void main() {
  testWidgets('admin orders filter chips', (tester) async {
    final orders = [
      const AdminOrderRow(id: '1', status: 'pending', customerName: 'Ali', slaMinutes: 10),
      const AdminOrderRow(id: '2', status: 'delayed', customerName: 'Sara', slaMinutes: 30),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          adminOrdersProvider.overrideWith((ref) => AsyncValue.data(orders)),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
          adminRepositoryProvider.overrideWithValue(_FakeAdminRepository()),
        ],
        child: const MaterialApp(home: AdminOrdersPage()),
      ),
    );

    await tester.pump();
    expect(find.textContaining('Order 1'), findsOneWidget);
    await tester.tap(find.text('DELAYED'));
    await tester.pump();
    expect(find.textContaining('Order 1'), findsNothing);
  });

  testWidgets('admin payouts approve action', (tester) async {
    final repo = _FakeAdminRepository();
    final payouts = [const AdminPayoutRow(id: 'pay-1', userName: 'Driver', amount: 100, status: 'pending')];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          adminRepositoryProvider.overrideWithValue(repo),
          adminPayoutsProvider.overrideWith((ref) => AsyncValue.data(payouts)),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: AdminPayoutsPage()),
      ),
    );

    await tester.pump();
    await tester.tap(find.text('Driver'));
    await tester.pump();
    expect(repo.lastPayoutApproval, isTrue);
  });

  testWidgets('admin reviews send decision', (tester) async {
    final repo = _FakeAdminRepository();
    final reviews = [const AdminReviewItem(id: 'rev-1', subject: 'Photo', type: 'photo', url: '')];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          adminRepositoryProvider.overrideWithValue(repo),
          adminReviewsProvider.overrideWith((ref) => AsyncValue.data(reviews)),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: AdminReviewsPage()),
      ),
    );

    await tester.pump();
    await tester.tap(find.text('Approve'));
    await tester.pump();
    expect(repo.lastReviewDecision, 'approved');
  });

  testWidgets('feature flags toggle saves', (tester) async {
    final repo = _FakeAdminRepository();
    final flags = [const AdminFeatureFlag(key: 'beta', enabled: false, description: 'Beta flag')];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          adminRepositoryProvider.overrideWithValue(repo),
          adminFlagsProvider.overrideWith((ref) => AsyncValue.data(flags)),
          analyticsServiceProvider.overrideWithValue(AnalyticsService.noop()),
        ],
        child: const MaterialApp(home: AdminSettingsPage()),
      ),
    );

    await tester.pump();
    await tester.tap(find.byType(SwitchListTile));
    await tester.pump();
    expect(repo.featureFlagUpdates['beta'], isTrue);
  });

  testWidgets('admin export hidden when feature flag disabled', (tester) async {
    final repo = _FakeAdminRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          adminRepositoryProvider.overrideWithValue(repo),
          adminTotalsProvider.overrideWith((ref) async => const AdminTotals(totalCustomerPaid: 1000, platformFee: 150, paidOrders: 20)),
          adminQueueProvider.overrideWith((ref) async => const AdminQueueCounts(paymentReview: 1, photoReview: 2, support: 0)),
          adminDriverProfitProvider.overrideWith((ref) async => const [ProfitBreakdown(name: 'Driver 1', value: 200)]),
          adminRestaurantProfitProvider.overrideWith((ref) async => const [ProfitBreakdown(name: 'Restaurant 1', value: 500)]),
          featureFlagsProvider.overrideWith((ref) async => const FeatureFlags(enableAdminExports: false)),
        ],
        child: const MaterialApp(home: AdminDashboardPage()),
      ),
    );

    await tester.pump();
    expect(find.text('Wallet transactions export'), findsNothing);
  });

  testWidgets('admin export copies CSV when feature flag enabled', (tester) async {
    final repo = _FakeAdminRepository()
      ..walletRows = [
        {
          'wallet_id': 'wallet-1',
          'amount': 50,
          'type': 'payout',
          'status': 'pending',
          'created_at': '2024-05-01T00:00:00Z',
        },
      ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          adminRepositoryProvider.overrideWithValue(repo),
          adminTotalsProvider.overrideWith((ref) async => const AdminTotals(totalCustomerPaid: 1000, platformFee: 150, paidOrders: 20)),
          adminQueueProvider.overrideWith((ref) async => const AdminQueueCounts(paymentReview: 1, photoReview: 2, support: 0)),
          adminDriverProfitProvider.overrideWith((ref) async => const [ProfitBreakdown(name: 'Driver 1', value: 200)]),
          adminRestaurantProfitProvider.overrideWith((ref) async => const [ProfitBreakdown(name: 'Restaurant 1', value: 500)]),
          featureFlagsProvider.overrideWith((ref) async => const FeatureFlags(enableAdminExports: true)),
        ],
        child: const MaterialApp(home: AdminDashboardPage()),
      ),
    );

    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'user-123');
    await tester.tap(find.text('Copy CSV'));
    await tester.pump();

    expect(repo.exportFetches, 1);
    expect(find.textContaining('Copied 1 rows'), findsOneWidget);
  });
}

class _FakeAdminRepository extends AdminRepository {
  _FakeAdminRepository() : super(SupabaseClient('http://localhost', 'anon'));

  bool? lastPayoutApproval;
  String? lastReviewDecision;
  int exportFetches = 0;
  List<Map<String, dynamic>> walletRows = const [];
  final Map<String, bool> featureFlagUpdates = {};

  @override
  Future<void> reviewPayout(String payoutId, bool approve) async {
    lastPayoutApproval = approve;
  }

  @override
  Future<void> decideReview(String reviewId, String decision) async {
    lastReviewDecision = decision;
  }

  @override
  Future<void> updateFeatureFlag(String key, bool enabled) async {
    featureFlagUpdates[key] = enabled;
  }

  @override
  Future<List<Map<String, dynamic>>> fetchWalletTransactions(String userId) async {
    exportFetches += 1;
    return walletRows;
  }
}
