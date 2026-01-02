import 'package:app_services/app_services.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final customerHomeControllerProvider = StateNotifierProvider.autoDispose<CustomerHomeController, CustomerHomeState>((ref) {
  final repo = ref.watch(customerRepositoryProvider);
  final userId = ref.watch(authStateProvider).user?.id;
  return CustomerHomeController(repo, userId: userId)..load();
});

class CustomerHomeController extends StateNotifier<CustomerHomeState> {
  CustomerHomeController(this._repository, {required this.userId}) : super(CustomerHomeState.initial());

  final CustomerRepository _repository;
  final String? userId;

  Future<void> load() async {
    state = state.copyWith(loading: true);
    try {
      final categories = await _repository.fetchCategories();
      final restaurants = await _repository.fetchRestaurants();
      state = state.copyWith(
        loading: false,
        categories: categories,
        restaurants: restaurants,
        filteredRestaurants: restaurants,
      );
    } catch (err) {
      state = state.copyWith(loading: false, error: err.toString());
    }
  }

  void setSearch(String value) {
    state = state.copyWith(searchQuery: value);
    _filter();
  }

  void toggleQuickFilter(String key) {
    final updated = Set<String>.from(state.quickFilters);
    if (updated.contains(key)) {
      updated.remove(key);
    } else {
      updated.add(key);
    }
    state = state.copyWith(quickFilters: updated);
    _filter();
  }

  void toggleFavorite(RestaurantModel restaurant) async {
    final favorites = Set<String>.from(state.favoriteRestaurantIds);
    final isFavorite = favorites.contains(restaurant.id);
    if (isFavorite) {
      favorites.remove(restaurant.id);
    } else {
      favorites.add(restaurant.id);
    }
    state = state.copyWith(favoriteRestaurantIds: favorites);
    if (userId != null) {
      await _repository.submitFavorite(restaurant.id, !isFavorite, userId!);
    }
  }

  void _filter() {
    List<RestaurantModel> filtered = [...state.restaurants];
    if (state.searchQuery.isNotEmpty) {
      filtered = filtered
          .where((restaurant) => restaurant.name.toLowerCase().contains(state.searchQuery.toLowerCase()))
          .toList();
    }
    if (state.quickFilters.contains('promoted')) {
      filtered = filtered.where((r) => r.isPromoted).toList();
    }
    if (state.quickFilters.contains('under15')) {
      filtered = filtered.where((r) => r.deliveryFee <= 15).toList();
    }
    if (state.quickFilters.contains('freeDelivery')) {
      filtered = filtered.where((r) => r.deliveryFee == 0).toList();
    }
    state = state.copyWith(filteredRestaurants: filtered);
  }
}

class CustomerHomeState {
  const CustomerHomeState({
    required this.categories,
    required this.restaurants,
    required this.filteredRestaurants,
    required this.quickFilters,
    required this.favoriteRestaurantIds,
    required this.loading,
    this.error,
    this.searchQuery = '',
  });

  factory CustomerHomeState.initial() => const CustomerHomeState(
        categories: [],
        restaurants: [],
        filteredRestaurants: [],
        quickFilters: <String>{},
        favoriteRestaurantIds: <String>{},
        loading: false,
      );

  final List<CategoryModel> categories;
  final List<RestaurantModel> restaurants;
  final List<RestaurantModel> filteredRestaurants;
  final Set<String> quickFilters;
  final Set<String> favoriteRestaurantIds;
  final bool loading;
  final String? error;
  final String searchQuery;

  CustomerHomeState copyWith({
    List<CategoryModel>? categories,
    List<RestaurantModel>? restaurants,
    List<RestaurantModel>? filteredRestaurants,
    Set<String>? quickFilters,
    Set<String>? favoriteRestaurantIds,
    bool? loading,
    String? error,
    String? searchQuery,
  }) {
    return CustomerHomeState(
      categories: categories ?? this.categories,
      restaurants: restaurants ?? this.restaurants,
      filteredRestaurants: filteredRestaurants ?? this.filteredRestaurants,
      quickFilters: quickFilters ?? this.quickFilters,
      favoriteRestaurantIds: favoriteRestaurantIds ?? this.favoriteRestaurantIds,
      loading: loading ?? this.loading,
      error: error,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}
