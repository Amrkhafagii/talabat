import 'dart:async';

import 'package:app_core/app_core.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final driverLocationTrackerProvider = Provider<DriverLocationTracker>((ref) {
  return DriverLocationTracker(ref.watch(supabaseProvider));
});

class DriverLocationTracker {
  DriverLocationTracker(this._supabase);

  final SupabaseClient _supabase;
  StreamSubscription<Position>? _subscription;

  Future<bool> startTracking(String driverId, {Duration interval = const Duration(seconds: 30)}) async {
    final granted = await _ensurePermission();
    if (!granted) return false;
    await _subscription?.cancel();

    final current = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
    await _updateDriverLocation(driverId, current);

    _subscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50,
      ),
    ).listen((position) {
      _updateDriverLocation(driverId, position);
    });
    return true;
  }

  Future<void> stopTracking() async {
    await _subscription?.cancel();
    _subscription = null;
  }

  Future<bool> _ensurePermission() async {
    var status = await Geolocator.checkPermission();
    if (status == LocationPermission.denied) {
      status = await Geolocator.requestPermission();
    }
    return status == LocationPermission.always || status == LocationPermission.whileInUse;
  }

  Future<void> _updateDriverLocation(String driverId, Position position) async {
    await _supabase
        .from('delivery_drivers')
        .update({
          'current_latitude': position.latitude,
          'current_longitude': position.longitude,
          'last_location_update': DateTime.now().toIso8601String(),
        })
        .eq('id', driverId);
  }
}
