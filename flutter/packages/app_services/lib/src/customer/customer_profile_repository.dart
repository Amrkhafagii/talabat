import 'dart:typed_data';

import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final customerProfileRepositoryProvider = Provider<CustomerProfileRepository>((ref) {
  return CustomerProfileRepository(ref.watch(supabaseProvider));
});

class CustomerProfileRepository {
  CustomerProfileRepository(this._supabase);

  final SupabaseClient _supabase;

  Future<CustomerProfile> fetchProfile(String userId) async {
    final response = await _supabase.from('users').select().eq('id', userId).maybeSingle();
    if (response == null) {
      throw Exception('Profile not found');
    }
    return CustomerProfile.fromJson(response);
  }

  Future<CustomerProfile> updateProfile(String userId, CustomerProfileUpdate update) async {
    final response = await _supabase
        .from('users')
        .update(update.toJson())
        .eq('id', userId)
        .select()
        .maybeSingle();
    if (response == null) {
      throw Exception('Failed to update profile');
    }
    return CustomerProfile.fromJson(response);
  }

  Future<String> uploadAvatar({required String userId, required Uint8List bytes, String mimeType = 'image/jpeg'}) async {
    final bucket = _supabase.storage.from('avatars');
    final filename = '$userId-${DateTime.now().millisecondsSinceEpoch}.jpg';
    await bucket.uploadBinary(filename, bytes, fileOptions: FileOptions(contentType: mimeType, upsert: true));
    return bucket.getPublicUrl(filename);
  }
}

class CustomerProfile {
  const CustomerProfile({
    required this.id,
    required this.email,
    required this.name,
    required this.phone,
    this.avatarUrl,
    this.metadata,
  });

  final String id;
  final String email;
  final String name;
  final String phone;
  final String? avatarUrl;
  final Map<String, dynamic>? metadata;

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    return CustomerProfile(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      name: json['full_name'] as String? ?? json['name'] as String? ?? '',
      phone: json['phone'] as String? ?? json['phone_number'] as String? ?? '',
      avatarUrl: json['avatar_url'] as String?,
      metadata: (json['user_metadata'] as Map<String, dynamic>?) ?? json['app_metadata'] as Map<String, dynamic>?,
    );
  }
}

class CustomerProfileUpdate {
  const CustomerProfileUpdate({this.name, this.phone, this.avatarUrl});

  final String? name;
  final String? phone;
  final String? avatarUrl;

  Map<String, dynamic> toJson() {
    return {
      if (name != null) 'full_name': name,
      if (phone != null) 'phone': phone,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
    };
  }
}
