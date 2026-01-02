import 'dart:async';

import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final realtimeOrdersServiceProvider = Provider<RealtimeOrdersService>((ref) {
  return RealtimeOrdersService(ref.watch(supabaseProvider));
});

class RealtimeOrdersService {
  RealtimeOrdersService(this._supabase);

  final SupabaseClient _supabase;

  Stream<List<Map<String, dynamic>>> watchOrders({String? userId, String? restaurantId, List<String>? orderIds}) {
    final controller = StreamController<List<Map<String, dynamic>>>.broadcast();
    final List<Map<String, dynamic>> orders = [];
    RealtimeChannel? channel;

    Future<void> load() async {
      var query = _supabase
          .from('orders')
          .select('*, restaurant:restaurants(*), order_items(*, menu_item:menu_items(*)), delivery:deliveries(*, driver:delivery_drivers(*))')
          .order('created_at', ascending: false);
      if (userId != null) {
        query = query.eq('user_id', userId);
      } else if (restaurantId != null) {
        query = query.eq('restaurant_id', restaurantId);
      } else if (orderIds != null && orderIds.isNotEmpty) {
        query = query.inFilter('id', orderIds);
      }
      final data = await query;
      orders
        ..clear()
        ..addAll((data as List).cast<Map<String, dynamic>>());
      controller.add(List<Map<String, dynamic>>.from(orders));
    }

    void handleChange(Map<String, dynamic> payload) {
      final eventType = payload['eventType'] as String;
      final newRecord = payload['new'] as Map<String, dynamic>?;
      final oldRecord = payload['old'] as Map<String, dynamic>?;
      switch (eventType) {
        case 'INSERT':
          if (newRecord != null) {
            orders.insert(0, newRecord);
          }
          break;
        case 'UPDATE':
          if (newRecord != null) {
            final idx = orders.indexWhere((o) => o['id'] == newRecord['id']);
            if (idx >= 0) {
              orders[idx] = {...orders[idx], ...newRecord};
            } else {
              orders.insert(0, newRecord);
            }
          }
          break;
        case 'DELETE':
          if (oldRecord != null) {
            orders.removeWhere((o) => o['id'] == oldRecord['id']);
          }
          break;
      }
      controller.add(List<Map<String, dynamic>>.from(orders));
    }

    load();
    channel = _supabase.channel('orders-stream-${userId ?? restaurantId ?? 'all'}').on(
      RealtimeListenTypes.postgresChanges,
      ChannelFilter(event: '*', schema: 'public', table: 'orders'),
      handleChange,
    );
    channel.subscribe();

    controller.onCancel = () {
      if (channel != null) {
        _supabase.removeChannel(channel);
      }
    };

    return controller.stream;
  }
}
