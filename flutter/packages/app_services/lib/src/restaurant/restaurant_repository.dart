import 'dart:typed_data';

import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../wallet/wallet_repository.dart';
import 'models.dart';

final restaurantRepositoryProvider = Provider<RestaurantRepository>((ref) {
  return RestaurantRepository(ref.watch(supabaseProvider));
});

class RestaurantRepository {
  RestaurantRepository(this._supabase);

  final SupabaseClient _supabase;

  Future<List<RestaurantOrder>> fetchCurrentOrders(String restaurantId) async {
    final response = await _supabase
        .from('orders')
        .select('*, user:users(full_name), order_items(*, menu_item:menu_items(*))')
        .eq('restaurant_id', restaurantId)
        .inFilter('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('created_at', ascending: false);
    return (response as List).map((row) => RestaurantOrder.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<List<MenuEditorItem>> fetchMenu(String restaurantId) async {
    final response = await _supabase
        .from('menu_items')
        .select()
        .eq('restaurant_id', restaurantId)
        .order('sort_order', ascending: true);
    return (response as List).map((row) => MenuEditorItem.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<void> updateMenuAvailability(String itemId, bool isAvailable) async {
    await _supabase.from('menu_items').update({'is_available': isAvailable}).eq('id', itemId);
  }

  Future<void> upsertMenuItem(MenuEditorItem item, {Uint8List? imageBytes, String? mimeType}) async {
    String? imageUrl = item.image;
    if (imageBytes != null) {
      imageUrl = await _uploadMenuPhoto(item.restaurantId, imageBytes, mimeType ?? 'image/jpeg');
    }
    await _supabase.from('menu_items').upsert({
      'id': item.id,
      'restaurant_id': item.restaurantId,
      'name': item.name,
      'description': item.description,
      'price': item.price,
      'image': imageUrl,
      'is_available': item.isAvailable,
    });
  }

  Future<String> _uploadMenuPhoto(String restaurantId, Uint8List bytes, String mimeType) async {
    final filename = '$restaurantId-${DateTime.now().millisecondsSinceEpoch}.jpg';
    final bucket = _supabase.storage.from('menu-photos');
    await bucket.uploadBinary(filename, bytes, fileOptions: FileOptions(contentType: mimeType));
    return bucket.getPublicUrl(filename);
  }

  Future<WalletSummary> fetchRestaurantWallet(String userId) async {
    final walletRepo = WalletRepository(_supabase);
    return walletRepo.fetchWalletSummary(userId);
  }

  Future<KycStatusModel> fetchKycStatus(String restaurantId) async {
    final response = await _supabase.rpc('get_kyc_status', params: {'p_restaurant_id': restaurantId});
    if (response is Map<String, dynamic>) {
      return KycStatusModel.fromJson(response);
    }
    return const KycStatusModel(status: 'pending');
  }

  Future<void> submitKycDocument({required String restaurantId, required Uint8List bytes, required String mimeType}) async {
    final bucket = _supabase.storage.from('kyc-docs');
    final filename = '$restaurantId-${DateTime.now().millisecondsSinceEpoch}.jpg';
    await bucket.uploadBinary(filename, bytes, fileOptions: FileOptions(contentType: mimeType));
    await _supabase
        .from('restaurant_kyc_documents')
        .insert({'restaurant_id': restaurantId, 'document_url': bucket.getPublicUrl(filename)});
  }

  Future<void> requestPayout(String walletId, double amount) async {
    await _supabase.rpc('initiate_restaurant_payout', params: {'p_wallet_id': walletId, 'p_amount': amount});
  }

  Future<RestaurantPerformanceSummary> fetchPerformanceSummary(String restaurantId) async {
    final response = await _supabase.rpc('restaurant_performance_summary', params: {'p_restaurant_id': restaurantId});
    if (response is Map<String, dynamic>) {
      return RestaurantPerformanceSummary.fromJson(response);
    }
    return const RestaurantPerformanceSummary(
      fulfillmentRate: 0,
      averagePrepMinutes: 0,
      ordersToday: 0,
      trustedArrivalTrend: <MetricPoint>[],
    );
  }

  Future<List<MetricPoint>> fetchArrivalMetrics(String restaurantId) async {
    final response = await _supabase.rpc('restaurant_trusted_arrival_trend', params: {'p_restaurant_id': restaurantId});
    return (response as List).map((row) => MetricPoint.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<List<RestaurantCategory>> fetchCategories(String restaurantId) async {
    final response = await _supabase
        .from('menu_categories')
        .select()
        .eq('restaurant_id', restaurantId)
        .order('sort_order', ascending: true);
    return (response as List).map((row) => RestaurantCategory.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<void> reorderCategories(List<String> orderedCategoryIds) async {
    for (var i = 0; i < orderedCategoryIds.length; i++) {
      await _supabase.from('menu_categories').update({'sort_order': i}).eq('id', orderedCategoryIds[i]);
    }
  }

  Future<void> upsertCategory(RestaurantCategory category, String restaurantId) async {
    await _supabase.from('menu_categories').upsert({
      'id': category.id,
      'restaurant_id': restaurantId,
      'name': category.name,
      'sort_order': category.sortOrder,
    });
  }

  Future<RestaurantOrderDetail> fetchOrderDetail(String orderId) async {
    final response = await _supabase.rpc('restaurant_order_detail', params: {'p_order_id': orderId});
    if (response is Map<String, dynamic>) {
      return RestaurantOrderDetail.fromJson(response);
    }
    throw Exception('Order not found');
  }

  Future<void> performOrderAction({required String orderId, required String action}) async {
    await _supabase.rpc('restaurant_order_action', params: {'p_order_id': orderId, 'p_action': action});
  }

  Future<RestaurantSettings> fetchSettings(String restaurantId) async {
    final response = await _supabase.rpc('restaurant_settings', params: {'p_restaurant_id': restaurantId});
    if (response is Map<String, dynamic>) {
      return RestaurantSettings.fromJson(response);
    }
    return RestaurantSettings(restaurantId: restaurantId, hours: const {}, latitude: null, longitude: null, staff: const []);
  }

  Future<void> saveSettings(RestaurantSettings settings) async {
    await _supabase.rpc('upsert_restaurant_settings', params: {
      'p_restaurant_id': settings.restaurantId,
      'p_hours': settings.hours.map((key, value) => MapEntry(key, value.toJson())),
      'p_latitude': settings.latitude,
      'p_longitude': settings.longitude,
    });
  }

  Future<void> inviteStaff(String restaurantId, String email) async {
    await _supabase.from('restaurant_staff_invites').insert({'restaurant_id': restaurantId, 'email': email});
  }

  Future<void> submitManualPayoutProof({required String walletId, required String note}) async {
    await _supabase.rpc('submit_manual_payout_proof', params: {'p_wallet_id': walletId, 'p_note': note});
  }
}
