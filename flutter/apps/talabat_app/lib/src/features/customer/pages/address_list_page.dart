import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../controllers/address_book_controller.dart';
import '../widgets/address_map_picker.dart';

class AddressListPage extends ConsumerWidget {
  const AddressListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(addressBookControllerProvider);
    final selected = ref.watch(locationControllerProvider).state.selectedAddress;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved addresses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/customer/profile'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/customer/addresses/new'),
        child: const Icon(Icons.add_location_alt_outlined),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(addressBookControllerProvider.notifier).load(),
        child: state.loading && state.addresses.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: EdgeInsets.all(TalabatColors.spacing.lg),
                children: [
                  if (state.error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(state.error!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.red)),
                    ),
                  ...state.addresses.map(
                    (address) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: TalabatCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(address.label, style: Theme.of(context).textTheme.titleMedium),
                                      Text(address.addressLine1, style: Theme.of(context).textTheme.bodyMedium),
                                      if (address.addressLine2 != null && address.addressLine2!.isNotEmpty)
                                        Text(address.addressLine2!, style: Theme.of(context).textTheme.bodySmall),
                                      if (address.city != null)
                                        Text('${address.city ?? ''} ${address.state ?? ''}'.trim(),
                                            style: Theme.of(context).textTheme.bodySmall),
                                    ],
                                  ),
                                ),
                                PopupMenuButton<String>(
                                  onSelected: (value) async {
                                    switch (value) {
                                      case 'edit':
                                        context.push('/customer/addresses/${address.id}/edit');
                                        break;
                                      case 'delete':
                                        await ref.read(addressBookControllerProvider.notifier).delete(address.id);
                                        break;
                                      case 'default':
                                        await ref.read(addressBookControllerProvider.notifier).setDefault(address);
                                        break;
                                    }
                                  },
                                  itemBuilder: (context) => [
                                    const PopupMenuItem(value: 'edit', child: Text('Edit')),
                                    const PopupMenuItem(value: 'delete', child: Text('Delete')),
                                    if (!address.isDefault)
                                      const PopupMenuItem(value: 'default', child: Text('Set default')),
                                  ],
                                ),
                              ],
                            ),
                            if (address.latitude != null && address.longitude != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: AddressMapPicker(
                                  enableMap: false,
                                  initialCoords: Coordinates(latitude: address.latitude!, longitude: address.longitude!),
                                  onLocationChanged: (_) {},
                                ),
                              ),
                            if (selected?.id == address.id || address.isDefault)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Chip(
                                  avatar: const Icon(Icons.check_circle, size: 16),
                                  label: Text(address.isDefault ? 'Default' : 'Active for checkout'),
                                ),
                              )
                            else
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton.icon(
                                  onPressed: () => ref.read(addressBookControllerProvider.notifier).setDefault(address),
                                  icon: const Icon(Icons.push_pin_outlined),
                                  label: const Text('Use for delivery'),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
