import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../location/location_state.dart';

final addressRepositoryProvider = Provider<AddressRepository>((ref) {
  return AddressRepository(ref.watch(supabaseProvider));
});

class AddressRepository {
  AddressRepository(this._supabase);

  final SupabaseClient _supabase;

  Future<List<UserAddress>> fetchAddresses(String userId) async {
    final response = await _supabase
        .from('user_addresses')
        .select()
        .eq('user_id', userId)
        .order('is_default', ascending: false)
        .order('updated_at', ascending: false);
    return (response as List)
        .cast<Map<String, dynamic>>()
        .map(UserAddress.fromJson)
        .toList();
  }

  Future<UserAddress> upsertAddress(AddressPayload payload) async {
    final response = await _supabase
        .from('user_addresses')
        .upsert(payload.toJson())
        .select()
        .maybeSingle();
    if (response == null) {
      throw Exception('Unable to save address');
    }
    return UserAddress.fromJson(response);
  }

  Future<void> deleteAddress(String addressId) async {
    await _supabase.from('user_addresses').delete().eq('id', addressId);
  }

  Future<void> setDefault(String addressId) async {
    await _supabase.rpc('set_default_address', params: {'p_address_id': addressId});
  }
}

class AddressPayload {
  const AddressPayload({
    this.id,
    required this.userId,
    required this.label,
    required this.addressLine1,
    this.addressLine2,
    this.city,
    this.state,
    this.country,
    this.latitude,
    this.longitude,
  });

  final String? id;
  final String userId;
  final String label;
  final String addressLine1;
  final String? addressLine2;
  final String? city;
  final String? state;
  final String? country;
  final double? latitude;
  final double? longitude;

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'label': label,
      'address_line_1': addressLine1,
      'address_line_2': addressLine2,
      'city': city,
      'state': state,
      'country': country,
      'latitude': latitude,
      'longitude': longitude,
    }..removeWhere((key, value) => value == null);
  }
}
