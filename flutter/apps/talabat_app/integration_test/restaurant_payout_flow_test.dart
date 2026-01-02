import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:integration_test/integration_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('restaurant payout + manual proof flow hits repositories and analytics', (tester) async {
    final repo = _RecordingRestaurantRepository();
    final analytics = _SpyAnalytics();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          restaurantRepositoryProvider.overrideWithValue(repo),
          analyticsServiceProvider.overrideWithValue(analytics),
        ],
        child: const _RestaurantPayoutHarness(),
      ),
    );

    await tester.enterText(find.byKey(const ValueKey('payout-amount-field')), '250');
    await tester.tap(find.text('Request payout'));
    await tester.pump();
    expect(repo.lastRequestedAmount, 250);
    expect(analytics.events.contains('restaurant_payout_request'), isTrue);

    await tester.enterText(find.byKey(const ValueKey('manual-proof-field')), 'Docs re-uploaded');
    await tester.tap(find.text('Submit manual proof'));
    await tester.pump();
    expect(repo.lastManualProofNote, 'Docs re-uploaded');
  });
}

class _RestaurantPayoutHarness extends HookConsumerWidget {
  const _RestaurantPayoutHarness();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final payoutController = useTextEditingController(text: '100');
    final manualController = useTextEditingController(text: 'Initial note');

    Future<void> requestPayout() async {
      final amount = double.tryParse(payoutController.text);
      if (amount == null) return;
      await ref.read(restaurantRepositoryProvider).requestPayout('wallet-1', amount);
      await ref
          .read(analyticsServiceProvider)
          .logEvent('restaurant_payout_request', parameters: {'amount': amount});
    }

    Future<void> submitManualProof() async {
      await ref
          .read(restaurantRepositoryProvider)
          .submitManualPayoutProof(walletId: 'wallet-1', note: manualController.text);
    }

    return MaterialApp(
      home: Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              TextField(
                key: const ValueKey('payout-amount-field'),
                controller: payoutController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount'),
              ),
              const SizedBox(height: 8),
              ElevatedButton(onPressed: requestPayout, child: const Text('Request payout')),
              const Divider(),
              TextField(
                key: const ValueKey('manual-proof-field'),
                controller: manualController,
                decoration: const InputDecoration(labelText: 'Manual proof note'),
              ),
              const SizedBox(height: 8),
              TextButton(onPressed: submitManualProof, child: const Text('Submit manual proof')),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecordingRestaurantRepository extends RestaurantRepository {
  _RecordingRestaurantRepository() : super(SupabaseClient('http://localhost', 'anon'));

  double? lastRequestedAmount;
  String? lastManualProofNote;

  @override
  Future<void> requestPayout(String walletId, double amount) async {
    lastRequestedAmount = amount;
  }

  @override
  Future<void> submitManualPayoutProof({required String walletId, required String note}) async {
    lastManualProofNote = note;
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
