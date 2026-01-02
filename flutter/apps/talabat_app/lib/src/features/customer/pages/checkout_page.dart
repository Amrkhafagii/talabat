import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

import '../controllers/address_book_controller.dart';
import '../widgets/select_address_sheet.dart';

class CheckoutPage extends HookConsumerWidget {
  const CheckoutPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartControllerProvider);
    final location = ref.watch(locationControllerProvider).state;
    final instructionsController = useTextEditingController();
    final tipController = useTextEditingController(text: '0');
    final loading = useState(false);
    final formatter = NumberFormat.currency(symbol: 'EGP ');

    Future<void> placeOrder() async {
      if (cart.items.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add items to cart first.')));
        return;
      }
      if (location.selectedAddress == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select an address first.')));
        return;
      }
      loading.value = true;
      try {
        final restaurantId = cart.items.first.item.restaurantId;
        final orderId = await ref.read(ordersRepositoryProvider).createOrderPaymentPending(
              CreateOrderRequest(
                userId: ref.read(authStateProvider).user?.id ?? '',
                restaurantId: restaurantId,
                deliveryAddressId: location.selectedAddress!.id,
                deliveryAddress: location.selectedAddress!.addressLine1,
                subtotal: cart.subtotal,
                deliveryFee: cart.deliveryFee,
                taxAmount: cart.tax,
                tipAmount: double.tryParse(tipController.text) ?? 0,
                total: cart.total + (double.tryParse(tipController.text) ?? 0),
                paymentMethod: 'cash',
                deliveryInstructions: instructionsController.text,
              ),
            );
        ref.read(cartControllerProvider.notifier).clear();
        if (context.mounted) {
          context.go('/customer/orders/$orderId');
        }
      } catch (err) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to place order: $err')));
      } finally {
        loading.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Padding(
        padding: EdgeInsets.all(TalabatColors.spacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Deliver to', style: Theme.of(context).textTheme.bodySmall),
                  Text(location.selectedAddress?.addressLine1 ?? 'No address selected', style: Theme.of(context).textTheme.titleMedium),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () async {
                        await ref.read(addressBookControllerProvider.notifier).load();
                        final selected = await showSelectAddressSheet(context);
                        if (selected != null) {
                          ref.read(locationControllerProvider).setSelectedAddress(selected);
                        }
                      },
                      icon: const Icon(Icons.swap_horiz, size: 16),
                      label: const Text('Change'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: instructionsController,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Delivery instructions', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: tipController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Tip amount', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 24),
            _SummaryRow(label: 'Subtotal', value: formatter.format(cart.subtotal)),
            _SummaryRow(label: 'Delivery fee', value: formatter.format(cart.deliveryFee)),
            _SummaryRow(label: 'Tax', value: formatter.format(cart.tax)),
          ],
        ),
      ),
      bottomNavigationBar: Padding(
        padding: EdgeInsets.all(TalabatColors.spacing.md),
        child: TalabatButton(
          label: loading.value ? 'Placing order...' : 'Place order',
          onPressed: loading.value ? null : placeOrder,
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(value, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}
