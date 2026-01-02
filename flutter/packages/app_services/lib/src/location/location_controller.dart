import 'package:app_core/app_core.dart';
import 'package:geolocator/geolocator.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../auth/auth_controller.dart';
import 'location_state.dart';

final locationControllerProvider = ChangeNotifierProvider<LocationController>((ref) {
  final controller = LocationController(supabase: ref.watch(supabaseProvider));
  ref.listen<AppAuthState>(authStateProvider, (previous, next) {
    controller.handleAuthState(next);
  });
  ref.onDispose(controller.dispose);
  return controller;
});

class LocationController extends ChangeNotifier {
  LocationController({SupabaseClient? supabase}) : _supabase = supabase;

  final SupabaseClient? _supabase;
  LocationState _state = const LocationState();
  String? _userId;

  LocationState get state => _state;

  void handleAuthState(AppAuthState state) {
    _userId = state.user?.id;
    if (_userId != null) {
      _loadDefaultAddress();
    } else {
      _setState(const LocationState());
    }
  }

  Future<void> refreshLocation() async {
    _setState(_state.copyWith(loading: true));
    try {
      final permission = await _ensurePermission();
      if (!permission) {
        _setState(_state.copyWith(error: 'Location permission denied', loading: false));
        return;
      }
      final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      _setState(_state.copyWith(
        coords: Coordinates(latitude: position.latitude, longitude: position.longitude),
        loading: false,
        error: null,
      ));
    } catch (err) {
      _setState(_state.copyWith(error: err.toString(), loading: false));
    }
  }

  Future<void> _loadDefaultAddress() async {
    final client = _supabase;
    if (client == null) return;
    final userId = _userId;
    if (userId == null) return;
    try {
      final response = await client
          .from('user_addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', ascending: false)
          .order('updated_at', ascending: false);
      final addresses = (response as List).cast<Map<String, dynamic>>().map(UserAddress.fromJson).toList();
      if (addresses.isNotEmpty) {
        _setState(_state.copyWith(selectedAddress: addresses.first));
      }
    } catch (_) {
      // Swallow errors until RLS/seed data ready.
    }
  }

  Future<bool> _ensurePermission() async {
    var status = await Geolocator.checkPermission();
    if (status == LocationPermission.denied) {
      status = await Geolocator.requestPermission();
    }
    if (status == LocationPermission.deniedForever) {
      await openAppSettings();
      return false;
    }
    return status == LocationPermission.always || status == LocationPermission.whileInUse;
  }

  Future<void> setSelectedAddress(UserAddress address) async {
    _setState(_state.copyWith(selectedAddress: address));
    await _supabase?.rpc('set_default_address', params: {'p_address_id': address.id}).catchError((_) => null);
  }

  void _setState(LocationState next) {
    _state = next;
    notifyListeners();
  }
}
