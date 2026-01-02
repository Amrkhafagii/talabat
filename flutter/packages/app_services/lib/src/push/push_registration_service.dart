import 'dart:io';

import 'package:app_core/app_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final pushRegistrationServiceProvider = Provider<PushRegistrationService>((ref) {
  return PushRegistrationService(
    messaging: FirebaseMessaging.instance,
    supabase: ref.watch(supabaseProvider),
  );
});

class PushRegistrationService {
  PushRegistrationService({required FirebaseMessaging messaging, required SupabaseClient supabase})
      : _messaging = messaging,
        _supabase = supabase;

  final FirebaseMessaging _messaging;
  final SupabaseClient _supabase;

  Future<void> registerToken(String userId) async {
    if (Platform.isIOS || Platform.isAndroid) {
      final settings = await _messaging.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        return;
      }
    }

    final token = await _messaging.getToken();
    if (token == null) return;

    final platform = _platformLabel();
    await _supabase.from('push_tokens').upsert({
      'user_id': userId,
      'token': token,
      'platform': platform,
      'updated_at': DateTime.now().toIso8601String(),
    });
  }

  String _platformLabel() {
    if (kIsWeb) return 'web';
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return 'unknown';
  }
}
