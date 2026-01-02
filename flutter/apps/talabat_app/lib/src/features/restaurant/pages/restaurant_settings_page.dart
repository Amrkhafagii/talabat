import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../../customer/widgets/address_map_picker.dart';

final restaurantSettingsProvider = FutureProvider.family<RestaurantSettings, String>((ref, restaurantId) {
  return ref.watch(restaurantRepositoryProvider).fetchSettings(restaurantId);
});

class RestaurantSettingsPage extends HookConsumerWidget {
  const RestaurantSettingsPage({super.key, this.restaurantIdOverride});

  final String? restaurantIdOverride;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final restaurantId = restaurantIdOverride ?? (auth.user?.appMetadata['restaurant_id'] as String?) ?? auth.user?.id;
    if (restaurantId == null) {
      return const Scaffold(body: Center(child: Text('Restaurant missing')));
    }
    final settingsAsync = ref.watch(restaurantSettingsProvider(restaurantId));

    return Scaffold(
      appBar: AppBar(title: const Text('Restaurant settings')),
      body: settingsAsync.when(
        data: (settings) => _SettingsForm(restaurantId: restaurantId, settings: settings),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load settings: $err')),
      ),
    );
  }
}

class _SettingsForm extends HookConsumerWidget {
  const _SettingsForm({required this.restaurantId, required this.settings});

  final String restaurantId;
  final RestaurantSettings settings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hours = useState<Map<String, HoursRange>>(Map.of(settings.hours));
    final coords = useState<Coordinates?>(settings.latitude != null && settings.longitude != null
        ? Coordinates(latitude: settings.latitude!, longitude: settings.longitude!)
        : null);
    final inviteController = useTextEditingController();
    final saving = useState(false);

    Future<void> save() async {
      saving.value = true;
      try {
        await ref.read(restaurantRepositoryProvider).saveSettings(settings.copyWith(
              hours: hours.value,
              latitude: coords.value?.latitude,
              longitude: coords.value?.longitude,
            ));
        await ref.read(analyticsServiceProvider).logEvent('restaurant_settings_saved');
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Settings saved.')));
        }
        ref.invalidate(restaurantSettingsProvider(restaurantId));
      } catch (err) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $err')));
      } finally {
        saving.value = false;
      }
    }

    Future<void> inviteStaff() async {
      if (inviteController.text.isEmpty) return;
      await ref.read(restaurantRepositoryProvider).inviteStaff(restaurantId, inviteController.text.trim());
      inviteController.clear();
      ref.invalidate(restaurantSettingsProvider(restaurantId));
    }

    return ListView(
      padding: EdgeInsets.all(TalabatColors.spacing.lg),
      children: [
        TalabatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Opening hours', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              ..._weekdays.map((day) {
                final range = hours.value[day] ?? const HoursRange(open: '08:00', close: '22:00');
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      SizedBox(width: 80, child: Text(day.toUpperCase())),
                      Expanded(
                        child: TextFormField(
                          initialValue: range.open,
                          decoration: const InputDecoration(labelText: 'Open'),
                          onChanged: (value) {
                            hours.value = {
                              ...hours.value,
                              day: HoursRange(open: value, close: hours.value[day]?.close ?? range.close),
                            };
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextFormField(
                          initialValue: range.close,
                          decoration: const InputDecoration(labelText: 'Close'),
                          onChanged: (value) {
                            hours.value = {
                              ...hours.value,
                              day: HoursRange(open: hours.value[day]?.open ?? range.open, close: value),
                            };
                          },
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 16),
        TalabatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('GPS pin', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              AddressMapPicker(
                initialCoords: coords.value,
                enableMap: true,
                onLocationChanged: (value) => coords.value = value,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        TalabatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Staff invites', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...settings.staff.map((member) => ListTile(
                    leading: const Icon(Icons.person_outline),
                    title: Text(member.name.isNotEmpty ? member.name : member.email),
                    subtitle: Text(member.status),
                  )),
              TextField(controller: inviteController, decoration: const InputDecoration(labelText: 'Invite via email')),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(onPressed: inviteStaff, child: const Text('Send invite')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        TalabatButton(label: saving.value ? 'Saving...' : 'Save settings', onPressed: saving.value ? null : save),
      ],
    );
  }
}

const _weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
