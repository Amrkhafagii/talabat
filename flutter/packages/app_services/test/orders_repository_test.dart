import 'package:app_services/src/repositories/orders_repository.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('createOrderPaymentPending maps payload to RPC params', () async {
    final captured = <String, dynamic>{};
    final repository = OrdersRepository((functionName, params) async {
      captured['fn'] = functionName;
      captured['params'] = params;
      return 'order-id';
    });

    final request = CreateOrderRequest(
      userId: 'user-1',
      restaurantId: 'rest-1',
      deliveryAddressId: 'addr-1',
      deliveryAddress: '123 Main St',
      subtotal: 100,
      deliveryFee: 10,
      taxAmount: 5,
      tipAmount: 3,
      total: 118,
      paymentMethod: 'card',
    );

    final id = await repository.createOrderPaymentPending(request);

    expect(id, 'order-id');
    expect(captured['fn'], 'create_order_payment_pending');
    expect(captured['params']['p_user_id'], 'user-1');
    expect(captured['params']['p_restaurant_id'], 'rest-1');
    expect(captured['params']['p_payment_method'], 'card');
  });
}
