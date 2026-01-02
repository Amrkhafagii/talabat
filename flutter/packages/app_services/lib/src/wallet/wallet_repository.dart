import 'package:app_core/app_core.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  return WalletRepository(ref.watch(supabaseProvider));
});

class WalletRepository {
  WalletRepository(this._supabase);

  final SupabaseClient _supabase;

  Future<WalletSummary> fetchWalletSummary(String userId) async {
    final wallets = await _supabase.from('wallets').select().eq('user_id', userId).maybeSingle();
    final transactions = await _supabase
        .from('wallet_transactions')
        .select()
        .eq('wallet_id', wallets?['id'])
        .order('created_at', ascending: false)
        .limit(20);
    return WalletSummary(
      walletId: wallets?['id'] as String? ?? '',
      balance: (wallets?['balance'] as num?)?.toDouble() ?? 0,
      pending: (wallets?['pending'] as num?)?.toDouble() ?? 0,
      transactions: (transactions as List).map((row) => WalletTransaction.fromJson(row as Map<String, dynamic>)).toList(),
    );
  }
}

class WalletSummary {
  const WalletSummary({required this.walletId, required this.balance, required this.pending, required this.transactions});

  final String walletId;
  final double balance;
  final double pending;
  final List<WalletTransaction> transactions;
}

class WalletTransaction {
  WalletTransaction({required this.amount, required this.type, required this.status, required this.createdAt});

  final double amount;
  final String type;
  final String status;
  final DateTime createdAt;

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      type: json['type'] as String? ?? 'unknown',
      status: json['status'] as String? ?? 'pending',
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
