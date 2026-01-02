import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../controllers/address_book_controller.dart';
import '../widgets/address_map_picker.dart';

class AddEditAddressPage extends HookConsumerWidget {
  const AddEditAddressPage({super.key, this.addressId});

  final String? addressId;

  bool get isEditing => addressId != null;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(addressBookControllerProvider);
    final locationState = ref.watch(locationControllerProvider).state;
    UserAddress? existing;
    if (isEditing) {
      try {
        existing = state.addresses.firstWhere((addr) => addr.id == addressId);
      } catch (_) {
        existing = null;
      }
    }

    if (isEditing && existing == null && state.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (isEditing && existing == null) {
      return const Scaffold(body: Center(child: Text('Address not found.')));
    }

    final labelController = useTextEditingController(text: existing?.label ?? '');
    final line1Controller = useTextEditingController(text: existing?.addressLine1 ?? '');
    final line2Controller = useTextEditingController(text: existing?.addressLine2 ?? '');
    final cityController = useTextEditingController(text: existing?.city ?? '');
    final stateController = useTextEditingController(text: existing?.state ?? '');
    final countryController = useTextEditingController(text: existing?.country ?? '');
    final coords = useState<Coordinates?>(existing?.latitude != null && existing?.longitude != null
        ? Coordinates(latitude: existing!.latitude!, longitude: existing.longitude!)
        : locationState.coords);
    final saving = useState(false);

    Future<void> submit() async {
      final userId = ref.read(authStateProvider).user?.id;
      if (userId == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Login required to save addresses.')));
        return;
      }
      if (line1Controller.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter an address line.')));
        return;
      }
      saving.value = true;
      try {
        await ref.read(addressBookControllerProvider.notifier).save(
              AddressPayload(
                id: existing?.id,
                userId: userId,
                label: labelController.text.isEmpty ? 'Home' : labelController.text,
                addressLine1: line1Controller.text,
                addressLine2: line2Controller.text.isEmpty ? null : line2Controller.text,
                city: cityController.text.isEmpty ? null : cityController.text,
                state: stateController.text.isEmpty ? null : stateController.text,
                country: countryController.text.isEmpty ? null : countryController.text,
                latitude: coords.value?.latitude,
                longitude: coords.value?.longitude,
              ),
            );
        if (context.mounted) {
          context.pop();
        }
      } catch (err) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to save: $err')));
      } finally {
        saving.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text(isEditing ? 'Edit address' : 'Add address')),
      body: ListView(
        padding: EdgeInsets.all(TalabatColors.spacing.lg),
        children: [
          TextField(controller: labelController, decoration: const InputDecoration(labelText: 'Label (home, work)', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: line1Controller, decoration: const InputDecoration(labelText: 'Address line 1', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: line2Controller, decoration: const InputDecoration(labelText: 'Address line 2', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: TextField(controller: cityController, decoration: const InputDecoration(labelText: 'City', border: OutlineInputBorder()))),
              const SizedBox(width: 12),
              Expanded(child: TextField(controller: stateController, decoration: const InputDecoration(labelText: 'State', border: OutlineInputBorder()))),
            ],
          ),
          const SizedBox(height: 12),
          TextField(controller: countryController, decoration: const InputDecoration(labelText: 'Country', border: OutlineInputBorder())),
          const SizedBox(height: 16),
          AddressMapPicker(
            initialCoords: coords.value,
            currentLocation: locationState.coords,
            onRequestGps: () => ref.read(locationControllerProvider).refreshLocation(),
            onLocationChanged: (next) {
              coords.value = next;
              ref.read(analyticsServiceProvider).logEvent('address_pin_drop', parameters: {'lat': next.latitude, 'lng': next.longitude});
            },
          ),
          const SizedBox(height: 24),
          TalabatButton(label: saving.value ? 'Saving...' : 'Save address', onPressed: saving.value ? null : submit),
        ],
      ),
    );
  }
}
