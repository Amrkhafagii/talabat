import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../eta/eta_utils.dart';
import '../realtime/realtime_orders_service.dart';

final orderStatusProvider = StreamProvider.family<OrderStatusState, String>((ref, orderId) {
  final realtime = ref.watch(realtimeOrdersServiceProvider);
  return realtime.watchOrders(orderIds: [orderId]).map((orders) {
    if (orders.isEmpty) return OrderStatusState.loading();
    final order = orders.first;
    return OrderStatusState.fromOrder(order);
  });
});

class OrderStatusState {
  OrderStatusState({
    required this.loading,
    this.status,
    this.restaurantName,
    this.driverName,
    this.eta,
    this.timelineIndex = 0,
    this.timelineLabels = const [],
    this.driverLocation,
  });

  factory OrderStatusState.loading() => OrderStatusState(loading: true);

  factory OrderStatusState.fromOrder(Map<String, dynamic> order) {
    final status = order['status'] as String? ?? 'pending';
    final eta = _deriveEta(order);
    final steps = const ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
    final index = steps.indexOf(status);
    final driver = order['delivery']?['driver']?['name'] as String?;
    final driverLoc = order['delivery']?['driver']?['current_latitude'] != null
        ? Coordinates(
            latitude: (order['delivery']['driver']['current_latitude'] as num).toDouble(),
            longitude: (order['delivery']['driver']['current_longitude'] as num).toDouble(),
          )
        : null;
    return OrderStatusState(
      loading: false,
      status: status,
      restaurantName: order['restaurant']?['name'] as String?,
      driverName: driver,
      eta: eta,
      timelineIndex: index < 0 ? 0 : index,
      timelineLabels: steps,
      driverLocation: driverLoc,
    );
  }

  final bool loading;
  final String? status;
  final String? restaurantName;
  final String? driverName;
  final EtaBand? eta;
  final int timelineIndex;
  final List<String> timelineLabels;
  final Coordinates? driverLocation;
}

class Coordinates {
  Coordinates({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

EtaBand? _deriveEta(Map<String, dynamic> order) {
  final low = order['eta_confidence_low'] as String?;
  final high = order['eta_confidence_high'] as String?;
  if (low != null && high != null) {
    final lowDate = DateTime.tryParse(low);
    final highDate = DateTime.tryParse(high);
    if (lowDate != null && highDate != null) {
      return EtaBand(
        etaMinutes: ((lowDate.difference(DateTime.now()).inMinutes + highDate.difference(DateTime.now()).inMinutes) / 2).round(),
        etaLowMinutes: lowDate.difference(DateTime.now()).inMinutes,
        etaHighMinutes: highDate.difference(DateTime.now()).inMinutes,
        trusted: true,
      );
    }
  }
  final restaurant = order['restaurant'];
  if (restaurant is Map<String, dynamic>) {
    final deliveryTime = restaurant['delivery_time'];
    final rating = (restaurant['rating'] as num?)?.toDouble() ?? 4.0;
    final eta = computeEtaBand(
      prepP50Minutes: 12,
      prepP90Minutes: 20,
      bufferMinutes: 5,
      travelMinutes: deliveryTime is num ? deliveryTime.round() : 15,
      reliabilityScore: rating / 5,
    );
    return eta;
  }
  return null;
}
