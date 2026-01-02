import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Cart increments when adding items', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: _CartHarness())));

    expect(find.text('Items: 0'), findsOneWidget);
    await tester.tap(find.text('Add item'));
    await tester.pump();
    expect(find.text('Items: 1'), findsOneWidget);
  });
}

class _CartHarness extends ConsumerWidget {
  const _CartHarness();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);
    final menuItem = MenuItemModel(
      id: 'item-1',
      restaurantId: 'rest-1',
      name: 'Falafel Wrap',
      description: 'Crispy falafel with tahini',
      price: 50,
      image: '',
    );
    return Scaffold(
      body: Center(child: Text('Items: ${cart.items.fold<int>(0, (sum, item) => sum + item.quantity)}')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => ref.read(cartControllerProvider.notifier).addItem(menuItem),
        label: const Text('Add item'),
      ),
    );
  }
}
