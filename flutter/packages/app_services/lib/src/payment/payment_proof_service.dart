import 'dart:typed_data';

import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final paymentProofServiceProvider = Provider<PaymentProofService>((ref) {
  return PaymentProofService(ref.watch(supabaseProvider));
});

class PaymentProofService {
  PaymentProofService(this._supabase);

  final SupabaseClient _supabase;

  Future<void> submitPaymentProof({
    required String orderId,
    required String transactionId,
    required double reportedAmount,
    required Uint8List bytes,
    required String contentType,
  }) async {
    final path = 'payment-proofs/$orderId-${DateTime.now().millisecondsSinceEpoch}';
    final storage = _supabase.storage.from('payment-proofs');
    await storage.uploadBinary(path, bytes, fileOptions: FileOptions(contentType: contentType));
    final url = storage.getPublicUrl(path);
    await _supabase.rpc('submit_payment_proof', params: {
      'p_order_id': orderId,
      'p_txn_id': transactionId,
      'p_reported_amount': reportedAmount,
      'p_proof_url': url,
      'p_paid_at': DateTime.now().toIso8601String(),
    });
  }
}
