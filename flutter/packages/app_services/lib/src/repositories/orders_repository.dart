import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) {
  final client = ref.watch(supabaseProvider);
  return OrdersRepository((fn, params) => client.rpc(fn, params: params));
});

class OrdersRepository {
  OrdersRepository(this._rpc);

  final Future<dynamic> Function(String, Map<String, dynamic>? params) _rpc;

  Future<String> createOrderPaymentPending(CreateOrderRequest request) async {
    final response = await _rpc('create_order_payment_pending', request.toRpcParams());
    if (response == null) {
      throw Exception('create_order_payment_pending returned null');
    }
    return response as String;
  }
}

class CreateOrderRequest {
  CreateOrderRequest({
    required this.userId,
    required this.restaurantId,
    required this.deliveryAddressId,
    required this.deliveryAddress,
    required this.subtotal,
    required this.deliveryFee,
    required this.taxAmount,
    required this.tipAmount,
    required this.total,
    required this.paymentMethod,
    this.deliveryInstructions,
    this.receiptUrl,
  });

  final String userId;
  final String restaurantId;
  final String deliveryAddressId;
  final String deliveryAddress;
  final double subtotal;
  final double deliveryFee;
  final double taxAmount;
  final double tipAmount;
  final double total;
  final String paymentMethod;
  final String? deliveryInstructions;
  final String? receiptUrl;

  Map<String, dynamic> toRpcParams() {
    return {
      'p_user_id': userId,
      'p_restaurant_id': restaurantId,
      'p_delivery_address_id': deliveryAddressId,
      'p_delivery_address': deliveryAddress,
      'p_subtotal': subtotal,
      'p_delivery_fee': deliveryFee,
      'p_tax_amount': taxAmount,
      'p_tip_amount': tipAmount,
      'p_total': total,
      'p_payment_method': paymentMethod,
      'p_payment_ref': null,
      'p_receipt_url': receiptUrl,
    };
  }
}
