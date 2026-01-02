import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:talabat_app/src/features/admin/pages/admin_dashboard_page.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('admin export is gated by feature flags', (tester) async {
    final repo = _TestAdminRepository()
      ..walletRows = [
        {
          'wallet_id': 'wallet-1',
          'amount': 40,
          'type': 'payout',
          'status': 'pending',
          'created_at': '2024-05-01T00:00:00Z',
        },
      ];

    Future<void> pumpWithFlag(bool enabled) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            adminRepositoryProvider.overrideWithValue(repo),
            adminTotalsProvider.overrideWith((ref) async => const AdminTotals(totalCustomerPaid: 2000, platformFee: 300, paidOrders: 45)),
            adminQueueProvider.overrideWith((ref) async => const AdminQueueCounts(paymentReview: 3, photoReview: 1, support: 0)),
            adminDriverProfitProvider.overrideWith((ref) async => const [ProfitBreakdown(name: 'Driver 1', value: 500)]),
            adminRestaurantProfitProvider.overrideWith((ref) async => const [ProfitBreakdown(name: 'Restaurant 1', value: 800)]),
            featureFlagsProvider.overrideWith((ref) async => FeatureFlags(enableAdminExports: enabled)),
          ],
          child: const MaterialApp(home: AdminDashboardPage()),
        ),
      );
      await tester.pumpAndSettle();
    }

    await pumpWithFlag(false);
    expect(find.text('Wallet transactions export'), findsNothing);

    await pumpWithFlag(true);
    await tester.enterText(find.byType(TextField), 'user-42');
    await tester.tap(find.text('Copy CSV'));
    await tester.pump();

    expect(repo.exportFetches, 1);
    expect(find.textContaining('Copied 1 rows'), findsOneWidget);
  });
}

class _TestAdminRepository extends AdminRepository {
  _TestAdminRepository() : super(SupabaseClient('http://localhost', 'anon'));

  int exportFetches = 0;
  List<Map<String, dynamic>> walletRows = const [];

  @override
  Future<List<Map<String, dynamic>>> fetchWalletTransactions(String userId) async {
    exportFetches += 1;
    return walletRows;
  }

  @override
  Future<AdminTotals> fetchTotals() async => const AdminTotals(totalCustomerPaid: 0, platformFee: 0, paidOrders: 0);

  @override
  Future<AdminQueueCounts> fetchQueueCounts() async => const AdminQueueCounts(paymentReview: 0, photoReview: 0, support: 0);

  @override
  Future<List<ProfitBreakdown>> fetchDriverProfit() async => const [];

  @override
  Future<List<ProfitBreakdown>> fetchRestaurantProfit() async => const [];
}
