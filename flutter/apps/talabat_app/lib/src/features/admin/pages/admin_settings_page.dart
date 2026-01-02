import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final adminFlagsProvider = FutureProvider<List<AdminFeatureFlag>>((ref) {
  return ref.watch(adminRepositoryProvider).fetchFeatureFlags();
});

class AdminSettingsPage extends ConsumerWidget {
  const AdminSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final flagsAsync = ref.watch(adminFlagsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Feature flags')),
      body: flagsAsync.when(
        data: (flags) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: flags
              .map(
                (flag) => TalabatCard(
                  child: SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(flag.key),
                    subtitle: Text(flag.description ?? ''),
                    value: flag.enabled,
                    onChanged: (value) => _toggle(ref, flag.key, value),
                  ),
                ),
              )
              .toList(),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed: $err')),
      ),
    );
  }

  Future<void> _toggle(WidgetRef ref, String key, bool enabled) async {
    await ref.read(adminRepositoryProvider).updateFeatureFlag(key, enabled);
    await ref.read(analyticsServiceProvider).logEvent('feature_flag_changed', parameters: {'key': key, 'enabled': enabled});
    ref.invalidate(adminFlagsProvider);
  }
}
