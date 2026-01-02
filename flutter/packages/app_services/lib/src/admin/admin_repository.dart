import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'models.dart';

final adminRepositoryProvider = Provider<AdminRepository>((ref) {
  return AdminRepository(ref.watch(supabaseProvider));
});

class AdminRepository {
  AdminRepository(this._supabase);

  final SupabaseClient _supabase;

  Future<AdminTotals> fetchTotals() async {
    final data = await _supabase.rpc('admin_totals');
    if (data is List && data.isNotEmpty) {
      return AdminTotals.fromJson(data.first as Map<String, dynamic>);
    }
    return const AdminTotals(totalCustomerPaid: 0, platformFee: 0, paidOrders: 0);
  }

  Future<AdminQueueCounts> fetchQueueCounts() async {
    final data = await _supabase.rpc('admin_queue_counts');
    if (data is Map<String, dynamic>) {
      return AdminQueueCounts.fromJson(data);
    }
    return const AdminQueueCounts(paymentReview: 0, photoReview: 0, support: 0);
  }

  Future<List<ProfitBreakdown>> fetchDriverProfit() async {
    final data = await _supabase.rpc('admin_driver_profit');
    return (data as List).map((row) => ProfitBreakdown.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<List<ProfitBreakdown>> fetchRestaurantProfit() async {
    final data = await _supabase.rpc('admin_restaurant_profit');
    return (data as List).map((row) => ProfitBreakdown.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<List<Map<String, dynamic>>> fetchWalletTransactions(String userId) async {
    final data = await _supabase.rpc('list_wallet_transactions_for_user', params: {'p_user_id': userId});
    return (data as List).cast<Map<String, dynamic>>();
  }

  Future<List<AdminOrderRow>> fetchOrders() async {
    final data = await _supabase.from('orders').select('id,status, customer:users(full_name), sla_minutes');
    return (data as List)
        .map((row) => AdminOrderRow.fromJson({
              'id': (row as Map<String, dynamic>)['id'],
              'status': row['status'],
              'customer_name': row['customer']?['full_name'],
              'sla_minutes': row['sla_minutes'],
            }))
        .toList();
  }

  Future<void> performAdminOrderAction({required String orderId, required String action}) async {
    await _supabase.rpc('admin_order_action', params: {'p_order_id': orderId, 'p_action': action});
  }

  Future<List<AdminPayoutRow>> fetchPayouts() async {
    final data = await _supabase.rpc('admin_payout_queue');
    return (data as List).map((row) => AdminPayoutRow.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<void> reviewPayout(String payoutId, bool approve) async {
    await _supabase.rpc('admin_review_payout', params: {'p_payout_id': payoutId, 'p_action': approve ? 'approve' : 'reject'});
  }

  Future<List<AdminReviewItem>> fetchReviewItems() async {
    final data = await _supabase.from('content_reviews').select().order('created_at', ascending: false).limit(50);
    return (data as List).map((row) => AdminReviewItem.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<void> decideReview(String reviewId, String decision) async {
    await _supabase.from('content_reviews').update({'status': decision}).eq('id', reviewId);
  }

  Future<List<AdminFeatureFlag>> fetchFeatureFlags() async {
    final data = await _supabase.from('feature_flags').select();
    return (data as List).map((row) => AdminFeatureFlag.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<void> updateFeatureFlag(String key, bool enabled) async {
    await _supabase.from('feature_flags').update({'enabled': enabled}).eq('key', key);
  }
}
