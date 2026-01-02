import 'package:app_services/app_services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import 'package:talabat_app/src/features/customer/controllers/address_book_controller.dart';
import 'package:talabat_app/src/features/customer/widgets/address_map_picker.dart';

void main() {
  testWidgets('address CRUD flow updates controller state', (tester) async {
    final repository = _FakeAddressRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          addressRepositoryProvider.overrideWithValue(repository),
          addressBookControllerProvider.overrideWith((ref) => AddressBookController(ref, debugUserId: 'user-123')),
        ],
        child: const MaterialApp(home: _AddressHarness()),
      ),
    );

    expect(find.textContaining('count:0'), findsOneWidget);

    await tester.tap(find.text('Add address'));
    await tester.pump();
    expect(find.textContaining('count:1'), findsOneWidget);
    expect(find.textContaining('default:false'), findsOneWidget);

    await tester.tap(find.text('Mark default'));
    await tester.pump();
    expect(repository.didSetDefault, isTrue);

    await tester.tap(find.text('Delete'));
    await tester.pump();
    expect(find.textContaining('count:0'), findsOneWidget);
  });

  testWidgets('address map picker uses GPS chips', (tester) async {
    Coordinates? changed;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AddressMapPicker(
            enableMap: false,
            currentLocation: const Coordinates(latitude: 30.0, longitude: 31.0),
            onLocationChanged: (coords) => changed = coords,
          ),
        ),
      ),
    );

    await tester.tap(find.byType(ActionChip));
    await tester.pump();
    expect(changed, isNotNull);
    expect(changed!.latitude, 30);
  });
}

class _AddressHarness extends ConsumerWidget {
  const _AddressHarness();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(addressBookControllerProvider);
    return Column(
      children: [
        Text('count:${state.addresses.length} default:${state.addresses.isNotEmpty && state.addresses.first.isDefault}'),
        TextButton(
          onPressed: () {
            ref.read(addressBookControllerProvider.notifier).save(
                  const AddressPayload(
                    userId: 'user-123',
                    label: 'Home',
                    addressLine1: 'Line 1',
                  ),
                );
          },
          child: const Text('Add address'),
        ),
        TextButton(
          onPressed: () {
            final address = ref.read(addressBookControllerProvider).addresses.first;
            ref.read(addressBookControllerProvider.notifier).setDefault(address);
          },
          child: const Text('Mark default'),
        ),
        TextButton(
          onPressed: () {
            final address = ref.read(addressBookControllerProvider).addresses.firstOrNull;
            if (address != null) {
              ref.read(addressBookControllerProvider.notifier).delete(address.id);
            }
          },
          child: const Text('Delete'),
        ),
      ],
    );
  }
}

class _FakeAddressRepository implements AddressRepository {
  final List<UserAddress> _addresses = [];
  bool didSetDefault = false;

  @override
  Future<void> deleteAddress(String addressId) async {
    _addresses.removeWhere((addr) => addr.id == addressId);
  }

  @override
  Future<List<UserAddress>> fetchAddresses(String userId) async {
    return _addresses;
  }

  @override
  Future<void> setDefault(String addressId) async {
    didSetDefault = true;
    for (var i = 0; i < _addresses.length; i++) {
      final addr = _addresses[i];
      _addresses[i] = UserAddress(
        id: addr.id,
        label: addr.label,
        addressLine1: addr.addressLine1,
        city: addr.city,
        state: addr.state,
        country: addr.country,
        isDefault: addr.id == addressId,
      );
    }
  }

  @override
  Future<UserAddress> upsertAddress(AddressPayload payload) async {
    final address = UserAddress(
      id: payload.id ?? 'addr-${_addresses.length + 1}',
      label: payload.label,
      addressLine1: payload.addressLine1,
      city: payload.city,
      state: payload.state,
      country: payload.country,
    );
    _addresses.removeWhere((addr) => addr.id == address.id);
    _addresses.add(address);
    return address;
  }
}

extension<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
