import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../customer/models.dart';

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  return CustomerRepository(ref.watch(supabaseProvider));
});

class CustomerRepository {
  CustomerRepository(this._supabase);

  final SupabaseClient _supabase;

  Future<List<CategoryModel>> fetchCategories() async {
    final response = await _supabase.from('categories').select().order('sort_order', ascending: true);
    return (response as List).cast<Map<String, dynamic>>().map(CategoryModel.fromJson).toList();
  }

  Future<RestaurantModel?> fetchRestaurant(String id) async {
    final response = await _supabase.from('restaurants').select().eq('id', id).maybeSingle();
    if (response == null) return null;
    return RestaurantModel.fromJson(response);
  }

  Future<List<RestaurantModel>> fetchRestaurants({
    String? search,
    List<String>? cuisines,
    double? minRating,
    double? maxDeliveryFee,
    bool? promotedOnly,
  }) async {
    var query = _supabase.from('restaurants').select();
    if (search != null && search.isNotEmpty) {
      query = query.ilike('name', '%$search%');
    }
    if (cuisines != null && cuisines.isNotEmpty) {
      query = query.inFilter('cuisine', cuisines);
    }
    if (minRating != null) {
      query = query.gte('rating', minRating);
    }
    if (maxDeliveryFee != null) {
      query = query.lte('delivery_fee', maxDeliveryFee);
    }
    if (promotedOnly == true) {
      query = query.eq('is_promoted', true);
    }
    final response = await query.order('rating', ascending: false);
    return (response as List).cast<Map<String, dynamic>>().map(RestaurantModel.fromJson).toList();
  }

  Future<List<MenuItemModel>> fetchMenuItems(String restaurantId) async {
    final response = await _supabase
        .from('menu_items')
        .select()
        .eq('restaurant_id', restaurantId)
        .eq('is_available', true)
        .order('sort_order', ascending: true);
    return (response as List).cast<Map<String, dynamic>>().map(MenuItemModel.fromJson).toList();
  }

  Future<void> submitFavorite(String restaurantId, bool isFavorite, String userId) async {
    if (isFavorite) {
      await _supabase.from('favorites').upsert({
            'restaurant_id': restaurantId,
            'user_id': userId,
          });
    } else {
      await _supabase
          .from('favorites')
          .delete()
          .eq('restaurant_id', restaurantId)
          .eq('user_id', userId);
    }
  }
}
