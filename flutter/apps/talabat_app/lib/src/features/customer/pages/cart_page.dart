import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

class CartPage extends ConsumerWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);
    final formatter = NumberFormat.currency(symbol: 'EGP ');

    return Scaffold(
      appBar: AppBar(title: const Text('Your Cart')),
      body: cart.items.isEmpty
          ? const Center(child: Text('Your cart is empty'))
          : ListView(
              padding: EdgeInsets.all(TalabatColors.spacing.lg),
              children: [
                ...cart.items.map(
                  (item) => TalabatCard(
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.item.name, style: Theme.of(context).textTheme.titleMedium),
                              Text(formatter.format(item.item.price), style: Theme.of(context).textTheme.bodySmall),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          onPressed: () => ref.read(cartControllerProvider.notifier).decrementItem(item.item.id),
                        ),
                        Text(item.quantity.toString()),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          onPressed: () => ref.read(cartControllerProvider.notifier).addItem(item.item),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                _SummaryRow(label: 'Subtotal', value: formatter.format(cart.subtotal)),
                _SummaryRow(label: 'Delivery fee', value: formatter.format(cart.deliveryFee)),
                _SummaryRow(label: 'Tax', value: formatter.format(cart.tax)),
                const Divider(),
                _SummaryRow(label: 'Total', value: formatter.format(cart.total), emphasize: true),
              ],
            ),
      bottomNavigationBar: cart.items.isEmpty
          ? null
          : Padding(
              padding: EdgeInsets.all(TalabatColors.spacing.md),
              child: TalabatButton(
                label: 'Checkout',
                onPressed: () => context.push('/customer/checkout'),
              ),
            ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value, this.emphasize = false});

  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final style = emphasize ? Theme.of(context).textTheme.titleMedium : Theme.of(context).textTheme.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text(value, style: style),
        ],
      ),
    );
  }
}
