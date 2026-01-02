import 'package:app_services/app_services.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

class AddressBookState {
  const AddressBookState({
    this.addresses = const [],
    this.loading = false,
    this.error,
  });

  final List<UserAddress> addresses;
  final bool loading;
  final String? error;

  AddressBookState copyWith({
    List<UserAddress>? addresses,
    bool? loading,
    String? error,
  }) {
    return AddressBookState(
      addresses: addresses ?? this.addresses,
      loading: loading ?? this.loading,
      error: error,
    );
  }
}

final addressBookControllerProvider = StateNotifierProvider<AddressBookController, AddressBookState>((ref) {
  return AddressBookController(ref);
});

class AddressBookController extends StateNotifier<AddressBookState> {
  AddressBookController(this._ref, {this.debugUserId}) : super(const AddressBookState()) {
    if (debugUserId == null) {
      _authSubscription = _ref.listen<AppAuthState>(
        authStateProvider,
        (previous, next) {
          final previousId = previous?.user?.id;
          final nextId = next.user?.id;
          if (nextId != null && nextId != previousId) {
            load();
          }
        },
        fireImmediately: true,
      );
    } else {
      load();
    }
  }

  final Ref _ref;
  final String? debugUserId;
  ProviderSubscription<AppAuthState>? _authSubscription;

  Future<void> load() async {
    final userId = debugUserId ?? _ref.read(authStateProvider).user?.id;
    if (userId == null) return;
    state = state.copyWith(loading: true, error: null);
    try {
      final addresses = await _ref.read(addressRepositoryProvider).fetchAddresses(userId);
      state = state.copyWith(addresses: addresses, loading: false);
    } catch (err) {
      state = state.copyWith(error: err.toString(), loading: false);
    }
  }

  Future<UserAddress> save(AddressPayload payload) async {
    final analytics = _ref.read(analyticsServiceProvider);
    try {
      final saved = await _ref.read(addressRepositoryProvider).upsertAddress(payload);
      await load();
      await analytics.logEvent('address_created', parameters: {'label': saved.label});
      return saved;
    } catch (err) {
      await analytics.logEvent('address_validation_failed', parameters: {'error': err.toString()});
      rethrow;
    }
  }

  Future<void> delete(String addressId) async {
    await _ref.read(addressRepositoryProvider).deleteAddress(addressId);
    await load();
  }

  Future<void> setDefault(UserAddress address) async {
    final analytics = _ref.read(analyticsServiceProvider);
    await _ref.read(addressRepositoryProvider).setDefault(address.id);
    _ref.read(locationControllerProvider).setSelectedAddress(address);
    await analytics.logEvent('address_set_default', parameters: {'id': address.id});
    await load();
  }

  @override
  void dispose() {
    _authSubscription?.close();
    super.dispose();
  }
}
