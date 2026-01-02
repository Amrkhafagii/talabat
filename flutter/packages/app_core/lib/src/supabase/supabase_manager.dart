import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/app_config.dart';

class SupabaseManager {
  SupabaseManager._();

  static Future<void> init() async {
    AppConfig.validate();
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(storage: FlutterSecureStorage()),
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
