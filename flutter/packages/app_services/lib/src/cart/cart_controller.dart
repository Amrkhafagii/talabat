import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../customer/models.dart';

final cartControllerProvider = StateNotifierProvider<CartController, CartState>((ref) {
  return CartController();
});

class CartController extends StateNotifier<CartState> {
  CartController() : super(const CartState(items: []));

  void addItem(MenuItemModel item) {
    final existing = state.items.where((i) => i.item.id == item.id).toList();
    if (existing.isEmpty) {
      state = state.copyWith(items: [...state.items, CartItem(item: item, quantity: 1)]);
    } else {
      final updated = state.items.map((cartItem) {
        if (cartItem.item.id == item.id) {
          return cartItem.copyWith(quantity: cartItem.quantity + 1);
        }
        return cartItem;
      }).toList();
      state = state.copyWith(items: updated);
    }
  }

  void decrementItem(String itemId) {
    final updated = state.items
        .map((cartItem) => cartItem.item.id == itemId
            ? cartItem.copyWith(quantity: cartItem.quantity - 1)
            : cartItem)
        .where((item) => item.quantity > 0)
        .toList();
    state = state.copyWith(items: updated);
  }

  void removeItem(String itemId) {
    state = state.copyWith(items: state.items.where((i) => i.item.id != itemId).toList());
  }

  void clear() {
    state = const CartState(items: []);
  }
}

class CartState {
  const CartState({required this.items, this.deliveryFee = 10, this.taxRate = 0.14});

  final List<CartItem> items;
  final double deliveryFee;
  final double taxRate;

  double get subtotal => items.fold(0, (sum, item) => sum + item.item.price * item.quantity);
  double get tax => subtotal * taxRate;
  double get total => subtotal + tax + deliveryFee;

  CartState copyWith({List<CartItem>? items, double? deliveryFee, double? taxRate}) {
    return CartState(
      items: items ?? this.items,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      taxRate: taxRate ?? this.taxRate,
    );
  }
}

class CartItem {
  const CartItem({required this.item, required this.quantity});

  final MenuItemModel item;
  final int quantity;

  CartItem copyWith({MenuItemModel? item, int? quantity}) {
    return CartItem(
      item: item ?? this.item,
      quantity: quantity ?? this.quantity,
    );
  }
}
