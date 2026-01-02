import 'dart:async';

import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final realtimeDeliveriesServiceProvider = Provider<RealtimeDeliveriesService>((ref) {
  return RealtimeDeliveriesService(ref.watch(supabaseProvider));
});

class RealtimeDeliveriesService {
  RealtimeDeliveriesService(this._supabase);

  final SupabaseClient _supabase;

  Stream<List<Map<String, dynamic>>> watchDriverDeliveries(String driverId, {bool includeAvailable = false}) {
    final controller = StreamController<List<Map<String, dynamic>>>.broadcast();
    final List<Map<String, dynamic>> assigned = [];
    final List<Map<String, dynamic>> available = [];
    RealtimeChannel? channel;

    Future<void> load() async {
      final driverDeliveries = await _supabase
          .from('deliveries')
          .select('*, order:orders(*, restaurant:restaurants(*), order_items(*, menu_item:menu_items(*)))')
          .eq('driver_id', driverId)
          .inFilter('status', ['assigned', 'picked_up', 'on_the_way']);
      assigned
        ..clear()
        ..addAll((driverDeliveries as List).cast<Map<String, dynamic>>());

      if (includeAvailable) {
        final availableDeliveries = await _supabase
            .from('deliveries')
            .select('*, order:orders(*, restaurant:restaurants(*), order_items(*, menu_item:menu_items(*)))')
            .eq('status', 'available')
            .order('created_at', ascending: true);
        available
          ..clear()
          ..addAll((availableDeliveries as List).cast<Map<String, dynamic>>());
      }

      controller.add(List<Map<String, dynamic>>.from(assigned));
    }

    void handleChange(Map<String, dynamic> payload) {
      final eventType = payload['eventType'] as String;
      final newRecord = payload['new'] as Map<String, dynamic>?;
      final oldRecord = payload['old'] as Map<String, dynamic>?;

      void upsert(List<Map<String, dynamic>> target, Map<String, dynamic>? record) {
        if (record == null) return;
        final idx = target.indexWhere((item) => item['id'] == record['id']);
        if (idx >= 0) {
          target[idx] = {...target[idx], ...record};
        } else {
          target.insert(0, record);
        }
      }

      switch (eventType) {
        case 'INSERT':
          if (newRecord != null && newRecord['driver_id'] == driverId) {
            upsert(assigned, newRecord);
          } else if (includeAvailable && newRecord?['status'] == 'available') {
            upsert(available, newRecord);
          }
          break;
        case 'UPDATE':
          if (newRecord != null && newRecord['driver_id'] == driverId) {
            upsert(assigned, newRecord);
          } else {
            assigned.removeWhere((item) => item['id'] == newRecord?['id']);
          }
          if (includeAvailable) {
            if (newRecord?['status'] == 'available') {
              upsert(available, newRecord);
            } else {
              available.removeWhere((item) => item['id'] == newRecord?['id']);
            }
          }
          break;
        case 'DELETE':
          assigned.removeWhere((item) => item['id'] == oldRecord?['id']);
          if (includeAvailable) {
            available.removeWhere((item) => item['id'] == oldRecord?['id']);
          }
          break;
      }

      controller.add(List<Map<String, dynamic>>.from(assigned));
    }

    load();
    channel = _supabase.channel('deliveries-stream-$driverId').on(
      RealtimeListenTypes.postgresChanges,
      ChannelFilter(event: '*', schema: 'public', table: 'deliveries'),
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
