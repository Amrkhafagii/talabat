import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'models.dart';
import '../wallet/wallet_repository.dart';

final deliveryRepositoryProvider = Provider<DeliveryRepository>((ref) {
  return DeliveryRepository(ref.watch(supabaseProvider));
});

class DeliveryRepository {
  DeliveryRepository(this._supabase);

  final SupabaseClient _supabase;

  Future<DeliveryJob?> fetchActiveDelivery(String driverId) async {
    final response = await _supabase
        .from('deliveries')
        .select()
        .eq('driver_id', driverId)
        .inFilter('status', ['assigned', 'picked_up', 'on_the_way'])
        .maybeSingle();
    if (response == null) return null;
    return DeliveryJob.fromJson(response);
  }

  Future<void> updateDeliveryStatus(String deliveryId, String status) async {
    await _supabase.rpc('update_delivery_status_safe', params: {'p_delivery_id': deliveryId, 'p_status': status});
  }

  Future<List<CashReconciliationEntry>> fetchCashReconciliation(String driverId) async {
    final response = await _supabase
        .from('cash_reconciliation_entries')
        .select()
        .eq('driver_id', driverId)
        .order('created_at', ascending: false);
    return (response as List)
        .map((row) => CashReconciliationEntry.fromJson(row as Map<String, dynamic>))
        .toList();
  }

  Future<void> confirmCashSettlement(String driverId, double amount) async {
    await _supabase.rpc('settle_driver_cash', params: {'p_driver_id': driverId, 'p_amount': amount});
  }

  Future<void> logIncident({required String deliveryId, required String category, required String description}) async {
    await _supabase.from('delivery_incidents').insert({
      'delivery_id': deliveryId,
      'category': category,
      'description': description,
    });
  }

  Future<EarningsSummary> fetchEarningsSummary(String driverId) async {
    final response = await _supabase.rpc('driver_earnings_summary', params: {'p_driver_id': driverId});
    if (response is Map<String, dynamic>) {
      return EarningsSummary.fromJson(response);
    }
    return const EarningsSummary(weekTotal: 0, pendingPayouts: 0, entries: []);
  }

  Future<List<DeliveryHistoryEntry>> fetchDeliveryHistory(String driverId) async {
    final response = await _supabase
        .from('deliveries')
        .select()
        .eq('driver_id', driverId)
        .order('completed_at', ascending: false)
        .limit(50);
    return (response as List).map((row) => DeliveryHistoryEntry.fromJson(row as Map<String, dynamic>)).toList();
  }

  Future<WalletSummary> fetchDriverWallet(String userId) async {
    final walletRepo = WalletRepository(_supabase);
    return walletRepo.fetchWalletSummary(userId);
  }

  Future<DriverProfile> fetchProfile(String driverId) async {
    final response = await _supabase.rpc('driver_profile', params: {'p_driver_id': driverId});
    if (response is Map<String, dynamic>) {
      return DriverProfile.fromJson(response);
    }
    throw Exception('Driver profile missing');
  }

  Future<void> updateAvailability(String driverId, bool available) async {
    await _supabase.from('drivers').update({'available': available}).eq('id', driverId);
  }

  Future<void> submitDriverPayoutProof({required String walletId, required String note}) async {
    await _supabase.rpc('submit_driver_payout_proof', params: {'p_wallet_id': walletId, 'p_note': note});
  }
}
