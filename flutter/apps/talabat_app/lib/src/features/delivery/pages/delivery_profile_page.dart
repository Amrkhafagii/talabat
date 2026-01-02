import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final driverProfileProvider = FutureProvider.family<DriverProfile, String>((ref, driverId) {
  return ref.watch(deliveryRepositoryProvider).fetchProfile(driverId);
});

class DeliveryProfilePage extends HookConsumerWidget {
  const DeliveryProfilePage({super.key, this.driverIdOverride});

  final String? driverIdOverride;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final driverId = driverIdOverride ?? (auth.user?.appMetadata['driver_id'] as String? ?? auth.user?.id);
    if (driverId == null) {
      return const Scaffold(body: Center(child: Text('Driver missing')));
    }
    final profileAsync = ref.watch(driverProfileProvider(driverId));

    return Scaffold(
      appBar: AppBar(title: const Text('Driver profile')),
      body: profileAsync.when(
        data: (profile) => _ProfileBody(profile: profile),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Unable to load: $err')),
      ),
    );
  }
}

class _ProfileBody extends HookConsumerWidget {
  const _ProfileBody({required this.profile});

  final DriverProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final available = useState(profile.available);

    Future<void> toggleAvailability(bool value) async {
      available.value = value;
      await ref.read(deliveryRepositoryProvider).updateAvailability(profile.driverId, value);
      await ref.read(analyticsServiceProvider).logEvent('driver_availability_changed', parameters: {'available': value});
    }

    return ListView(
      padding: EdgeInsets.all(TalabatColors.spacing.lg),
      children: [
        TalabatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(profile.name, style: Theme.of(context).textTheme.titleMedium),
              Text(profile.vehicle),
              SwitchListTile(
                value: available.value,
                onChanged: toggleAvailability,
                title: const Text('Available for new jobs'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        TalabatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Documents', style: Theme.of(context).textTheme.titleMedium),
              ...profile.documents.map((doc) => ListTile(
                    leading: const Icon(Icons.description_outlined),
                    title: Text(doc.name),
                    trailing: Text(doc.status),
                  )),
            ],
          ),
        ),
      ],
    );
  }
}
