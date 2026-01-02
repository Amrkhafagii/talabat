// GENERATED CODE - DO NOT MODIFY BY HAND.

import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseRpcRepository {
  const SupabaseRpcRepository(this._client);

  final SupabaseClient _client;

  Future<dynamic> createOrderPaymentPending({required String pUserId, required String pRestaurantId, required String pDeliveryAddressId, required String pDeliveryAddress, required double pSubtotal, required double pDeliveryFee, required double pTaxAmount, double? pTipAmount, required String pPaymentMethod, String? pPaymentRef}) {
    return _client.rpc(
      'create_order_payment_pending',
      params: {'p_user_id': pUserId, 'p_restaurant_id': pRestaurantId, 'p_delivery_address_id': pDeliveryAddressId, 'p_delivery_address': pDeliveryAddress, 'p_subtotal': pSubtotal, 'p_delivery_fee': pDeliveryFee, 'p_tax_amount': pTaxAmount, 'p_tip_amount': pTipAmount, 'p_payment_method': pPaymentMethod, 'p_payment_ref': pPaymentRef},
    );
  }

  Future<dynamic> submitPaymentProof({required String pOrderId, required String pTxnId, required double pReportedAmount, required String pReceiptUrl}) {
    return _client.rpc(
      'submit_payment_proof',
      params: {'p_order_id': pOrderId, 'p_txn_id': pTxnId, 'p_reported_amount': pReportedAmount, 'p_receipt_url': pReceiptUrl},
    );
  }

  Future<dynamic> setDefaultAddress({required String pUserId, required String pAddressId}) {
    return _client.rpc(
      'set_default_address',
      params: {'p_user_id': pUserId, 'p_address_id': pAddressId},
    );
  }

  Future<dynamic> rerouteOrderRpc({required String pOrderId, required String pBackupRestaurantId, required String pIdempotencyKey}) {
    return _client.rpc(
      'reroute_order_rpc',
      params: {'p_order_id': pOrderId, 'p_backup_restaurant_id': pBackupRestaurantId, 'p_idempotency_key': pIdempotencyKey},
    );
  }

  Future<dynamic> updateDeliveryStatusSafe({required String pDeliveryId, required String pNextStatus, double? pLocationLat, double? pLocationLng}) {
    return _client.rpc(
      'update_delivery_status_safe',
      params: {'p_delivery_id': pDeliveryId, 'p_next_status': pNextStatus, 'p_location_lat': pLocationLat, 'p_location_lng': pLocationLng},
    );
  }

  Future<dynamic> initiateRestaurantPayout({required String pOrderId, required String pIdempotencyKey, required String pPayoutRef}) {
    return _client.rpc(
      'initiate_restaurant_payout',
      params: {'p_order_id': pOrderId, 'p_idempotency_key': pIdempotencyKey, 'p_payout_ref': pPayoutRef},
    );
  }

  Future<dynamic> finalizeRestaurantPayout({required String pOrderId, required String pIdempotencyKey, required bool pSuccess, required String pPayoutRef}) {
    return _client.rpc(
      'finalize_restaurant_payout',
      params: {'p_order_id': pOrderId, 'p_idempotency_key': pIdempotencyKey, 'p_success': pSuccess, 'p_payout_ref': pPayoutRef},
    );
  }

  Future<dynamic> adminTotals() {
    return _client.rpc(
      'admin_totals'
    );
  }

  Future<dynamic> adminQueueCounts() {
    return _client.rpc(
      'admin_queue_counts'
    );
  }

  Future<dynamic> adminDriverProfit() {
    return _client.rpc(
      'admin_driver_profit'
    );
  }

  Future<dynamic> adminRestaurantProfit() {
    return _client.rpc(
      'admin_restaurant_profit'
    );
  }

  Future<dynamic> listWalletTransactionsForUser({required String pUserId}) {
    return _client.rpc(
      'list_wallet_transactions_for_user',
      params: {'p_user_id': pUserId},
    );
  }

  Future<dynamic> adminOrderAction({required String pOrderId, required String pAction}) {
    return _client.rpc(
      'admin_order_action',
      params: {'p_order_id': pOrderId, 'p_action': pAction},
    );
  }
}
