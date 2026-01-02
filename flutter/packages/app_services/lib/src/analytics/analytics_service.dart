import 'dart:developer' as developer;

import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  return AnalyticsService(ref.watch(supabaseProvider));
});

class AnalyticsService {
  AnalyticsService(SupabaseClient supabase) : _supabase = supabase;
  AnalyticsService.noop() : _supabase = null;

  final SupabaseClient? _supabase;

  Future<void> logEvent(String name, {Map<String, dynamic>? parameters}) async {
    try {
      await _supabase?.from('telemetry_events').insert({
        'name': name,
        'params': parameters ?? const <String, dynamic>{},
        'created_at': DateTime.now().toIso8601String(),
      });
    } catch (err) {
      developer.log('logEvent failed', error: err, name: 'AnalyticsService');
    }
  }

  Future<void> recordCrash({required Object error, required StackTrace stack, String? context}) async {
    try {
      await _supabase?.from('telemetry_crashes').insert({
        'context': context ?? 'flutter',
        'error': error.toString(),
        'stacktrace': stack.toString(),
        'created_at': DateTime.now().toIso8601String(),
      });
    } catch (err) {
      developer.log('recordCrash failed', error: err, name: 'AnalyticsService');
    }
  }
}
