import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final featureFlagServiceProvider = Provider<FeatureFlagService>((ref) {
  return FeatureFlagService(ref.watch(supabaseProvider));
});

final featureFlagsProvider = FutureProvider<FeatureFlags>((ref) {
  return ref.watch(featureFlagServiceProvider).fetchFlags();
});

class FeatureFlagService {
  FeatureFlagService(this._supabase);

  final SupabaseClient _supabase;

  Future<FeatureFlags> fetchFlags() async {
    try {
      final response = await _supabase.from('feature_flags').select().maybeSingle();
      if (response != null) {
        return FeatureFlags.fromJson(response);
      }
    } catch (_) {
      // Allow fallback to defaults when Supabase table is missing or access is denied.
    }
    return const FeatureFlags();
  }
}

class FeatureFlags {
  const FeatureFlags({
    this.showCustomerBetaBanner = true,
    this.enableIncidentReporting = true,
    this.enableAdminExports = true,
  });

  final bool showCustomerBetaBanner;
  final bool enableIncidentReporting;
  final bool enableAdminExports;

  factory FeatureFlags.fromJson(Map<String, dynamic> json) {
    return FeatureFlags(
      showCustomerBetaBanner: json['show_customer_beta_banner'] as bool? ?? true,
      enableIncidentReporting: json['enable_incident_reporting'] as bool? ?? true,
      enableAdminExports: json['enable_admin_exports'] as bool? ?? true,
    );
  }
}
