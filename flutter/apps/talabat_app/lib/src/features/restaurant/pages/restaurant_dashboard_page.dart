import 'dart:typed_data';

import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

final _restaurantOrdersProvider = FutureProvider.family<List<RestaurantOrder>, String>((ref, id) {
  return ref.watch(restaurantRepositoryProvider).fetchCurrentOrders(id);
});

final _restaurantMenuProvider = FutureProvider.family<List<MenuEditorItem>, String>((ref, id) {
  return ref.watch(restaurantRepositoryProvider).fetchMenu(id);
});

final _restaurantWalletProvider = FutureProvider.family<WalletSummary, String>((ref, userId) {
  return ref.watch(restaurantRepositoryProvider).fetchRestaurantWallet(userId);
});

final _restaurantKycProvider = FutureProvider.family<KycStatusModel, String>((ref, restaurantId) {
  return ref.watch(restaurantRepositoryProvider).fetchKycStatus(restaurantId);
});

class RestaurantDashboardPage extends HookConsumerWidget {
  const RestaurantDashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final restaurantId = authState.user?.appMetadata['restaurant_id'] as String? ?? authState.user?.id;
    final userId = authState.user?.id;
    if (restaurantId == null || userId == null) {
      return const Scaffold(body: Center(child: Text('Restaurant profile unavailable.')));
    }
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Restaurant Console'),
          bottom: const TabBar(tabs: [
            Tab(text: 'Orders', icon: Icon(Icons.receipt_long)),
            Tab(text: 'Menu', icon: Icon(Icons.fastfood)),
            Tab(text: 'Wallet & KYC', icon: Icon(Icons.account_balance_wallet)),
          ]),
          actions: [
            PopupMenuButton<String>(
              onSelected: (value) {
                switch (value) {
                  case 'performance':
                    context.push('/restaurant/performance');
                    break;
                  case 'metrics':
                    context.push('/restaurant/metrics');
                    break;
                  case 'settings':
                    context.push('/restaurant/settings');
                    break;
                }
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'performance', child: Text('Performance')),
                PopupMenuItem(value: 'metrics', child: Text('Arrival metrics')),
                PopupMenuItem(value: 'settings', child: Text('Settings & staff')),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.admin_panel_settings),
              onPressed: () => context.push('/admin'),
            ),
          ],
        ),
        body: TabBarView(
          children: [
            _OrdersTab(restaurantId: restaurantId),
            _MenuTab(restaurantId: restaurantId),
            _WalletTab(restaurantId: restaurantId, userId: userId),
          ],
        ),
      ),
    );
  }
}

class _OrdersTab extends ConsumerWidget {
  const _OrdersTab({required this.restaurantId});

  final String restaurantId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(_restaurantOrdersProvider(restaurantId));
    final formatter = DateFormat.yMMMd().add_jm();
    return ordersAsync.when(
      data: (orders) => RefreshIndicator(
        onRefresh: () => ref.refresh(_restaurantOrdersProvider(restaurantId).future),
        child: ListView.builder(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          itemCount: orders.length,
          itemBuilder: (context, index) {
            final order = orders[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: TalabatCard(
                child: InkWell(
                  onTap: () => context.push('/restaurant/orders/${order.id}'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Order ${order.id.substring(0, 6)} • ${order.status.toUpperCase()}',
                          style: Theme.of(context).textTheme.titleMedium),
                      Text('Placed by ${order.customerName} on ${formatter.format(order.createdAt)}'),
                      const Divider(),
                      ...order.items.map((item) => Text('${item.quantity} × ${item.name}')),
                      const SizedBox(height: 8),
                      Text('Total: EGP ${order.total.toStringAsFixed(2)}', style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text(err.toString())),
    );
  }
}

class _MenuTab extends HookConsumerWidget {
  const _MenuTab({required this.restaurantId});

  final String restaurantId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menuAsync = ref.watch(_restaurantMenuProvider(restaurantId));
    return menuAsync.when(
      data: (items) => ListView(
        padding: EdgeInsets.all(TalabatColors.spacing.lg),
        children: [
          Row(
            children: [
              Expanded(
                child: TalabatButton(
                  label: 'Add dish',
                  onPressed: () => _openMenuEditor(context, ref, restaurantId),
                ),
              ),
              const SizedBox(width: 12),
              TextButton(
                onPressed: () => context.push('/restaurant/categories'),
                child: const Text('Manage categories'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...items.map((item) => TalabatCard(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.name, style: Theme.of(context).textTheme.titleMedium),
                          Text(item.description, style: Theme.of(context).textTheme.bodySmall),
                          const SizedBox(height: 4),
                          Text('EGP ${item.price.toStringAsFixed(2)}'),
                        ],
                      ),
                    ),
                    Switch(
                      value: item.isAvailable,
                      onChanged: (value) => ref.read(restaurantRepositoryProvider).updateMenuAvailability(item.id, value).then((_) => ref.refresh(_restaurantMenuProvider(restaurantId))),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit),
                      onPressed: () => _openMenuEditor(context, ref, restaurantId, existing: item),
                    ),
                  ],
                ),
              )),
        ],
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text(err.toString())),
    );
  }

  Future<void> _openMenuEditor(BuildContext context, WidgetRef ref, String restaurantId, {MenuEditorItem? existing}) async {
    final nameController = TextEditingController(text: existing?.name ?? '');
    final priceController = TextEditingController(text: existing?.price.toString() ?? '');
    final descriptionController = TextEditingController(text: existing?.description ?? '');
    Uint8List? imageBytes;
    String? mimeType;
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(existing == null ? 'Add menu item' : 'Edit menu item'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Name')),
              const SizedBox(height: 8),
              TextField(controller: descriptionController, decoration: const InputDecoration(labelText: 'Description')),
              const SizedBox(height: 8),
              TextField(controller: priceController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price')),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () async {
                    final picker = ImagePicker();
                    final picked = await picker.pickImage(source: ImageSource.gallery);
                    if (picked != null) {
                      imageBytes = await picked.readAsBytes();
                      mimeType = picked.mimeType ?? 'image/jpeg';
                    }
                  },
                  icon: const Icon(Icons.photo_library),
                  label: const Text('Upload photo'),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TalabatButton(
            label: 'Save',
            onPressed: () async {
              final item = MenuEditorItem(
                id: existing?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                restaurantId: restaurantId,
                name: nameController.text,
                description: descriptionController.text,
                price: double.tryParse(priceController.text) ?? 0,
                image: existing?.image ?? '',
                isAvailable: existing?.isAvailable ?? true,
              );
              await ref.read(restaurantRepositoryProvider).upsertMenuItem(item, imageBytes: imageBytes, mimeType: mimeType);
              if (context.mounted) {
                Navigator.pop(context);
                ref.refresh(_restaurantMenuProvider(restaurantId));
              }
            },
          ),
        ],
      ),
    );
  }
}

class _WalletTab extends HookConsumerWidget {
  const _WalletTab({required this.restaurantId, required this.userId});

  final String restaurantId;
  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(_restaurantWalletProvider(userId));
    final kycAsync = ref.watch(_restaurantKycProvider(restaurantId));
    final payoutController = useTextEditingController();
    final manualNoteController = useTextEditingController();
    final loading = useState(false);
    final manualStatus = useState<String?>(null);
    final formatter = NumberFormat.currency(symbol: 'EGP ');
    final analytics = ref.watch(analyticsServiceProvider);

    Future<void> submitKyc() async {
      final result = await FilePicker.platform.pickFiles(withData: true, allowedExtensions: ['png', 'jpg', 'pdf'], type: FileType.custom);
      if (result == null || result.files.isEmpty) return;
      final file = result.files.first;
      await ref.read(restaurantRepositoryProvider).submitKycDocument(
            restaurantId: restaurantId,
            bytes: file.bytes!,
            mimeType: file.mimeType ?? 'application/octet-stream',
          );
      ref.refresh(_restaurantKycProvider(restaurantId));
    }

    Future<void> requestPayout() async {
      final amount = double.tryParse(payoutController.text);
      if (amount == null) return;
      loading.value = true;
      try {
        final wallet = await ref.read(_restaurantWalletProvider(userId).future);
        await ref.read(restaurantRepositoryProvider).requestPayout(wallet.walletId, amount);
        await analytics.logEvent('restaurant_payout_request', parameters: {'amount': amount});
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payout requested.')));
        }
      } catch (err) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $err')));
        }
      } finally {
        loading.value = false;
      }
    }

    Future<void> submitManualProof() async {
      try {
        final wallet = await ref.read(_restaurantWalletProvider(userId).future);
        await ref
            .read(restaurantRepositoryProvider)
            .submitManualPayoutProof(walletId: wallet.walletId, note: manualNoteController.text.trim());
        manualNoteController.clear();
        manualStatus.value = 'Manual proof submitted';
      } catch (err) {
        manualStatus.value = 'Submission failed: $err';
      }
    }

    return ListView(
      padding: EdgeInsets.all(TalabatColors.spacing.lg),
      children: [
        walletAsync.when(
          data: (summary) => TalabatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Available balance', style: Theme.of(context).textTheme.bodySmall),
                Text(formatter.format(summary.balance), style: Theme.of(context).textTheme.displaySmall),
                Text('Pending: ${formatter.format(summary.pending)}'),
              ],
            ),
          ),
          loading: () => const TalabatSkeleton.rect(height: 80),
          error: (err, _) => Text(err.toString()),
        ),
        const SizedBox(height: 16),
        walletAsync.when(
          data: (summary) => TalabatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Payout timeline', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                ...summary.transactions.map(
                  (txn) => ListTile(
                    leading: Icon(txn.status == 'pending' ? Icons.timelapse : Icons.check_circle),
                    title: Text(txn.type),
                    subtitle: Text('${txn.status} • ${DateFormat.yMMMd().format(txn.createdAt)}'),
                    trailing: Text(formatter.format(txn.amount)),
                  ),
                ),
                const Divider(),
                TextField(
                  controller: manualNoteController,
                  decoration: const InputDecoration(labelText: 'Manual proof note', border: OutlineInputBorder()),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: submitManualProof,
                    icon: const Icon(Icons.upload),
                    label: const Text('Submit manual proof'),
                  ),
                ),
                if (manualStatus.value != null)
                  Text(manualStatus.value!, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          loading: () => const SizedBox.shrink(),
          error: (err, _) => Text(err.toString()),
        ),
        const SizedBox(height: 16),
        kycAsync.when(
          data: (kyc) => TalabatCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('KYC Status: ${kyc.status.toUpperCase()}', style: Theme.of(context).textTheme.titleMedium),
                if (kyc.notes != null) Text(kyc.notes!, style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 12),
                TalabatButton(label: 'Upload document', onPressed: submitKyc),
              ],
            ),
          ),
          loading: () => const TalabatSkeleton.rect(height: 80),
          error: (err, _) => Text(err.toString()),
        ),
        const SizedBox(height: 16),
        TalabatCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Request payout', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              TextField(
                controller: payoutController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TalabatButton(
                label: loading.value ? 'Submitting...' : 'Request payout',
                onPressed: loading.value ? null : requestPayout,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
