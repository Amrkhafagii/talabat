import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final adminReviewsProvider = FutureProvider<List<AdminReviewItem>>((ref) {
  return ref.watch(adminRepositoryProvider).fetchReviewItems();
});

class AdminReviewsPage extends ConsumerWidget {
  const AdminReviewsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviewsAsync = ref.watch(adminReviewsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Content reviews')),
      body: reviewsAsync.when(
        data: (items) => ListView(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: items
              .map(
                (item) => TalabatCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.subject, style: Theme.of(context).textTheme.titleMedium),
                      Text(item.type),
                      const SizedBox(height: 8),
                      ButtonBar(
                        children: [
                          TextButton(onPressed: () => _decide(context, ref, item.id, 'approved'), child: const Text('Approve')),
                          TextButton(onPressed: () => _decide(context, ref, item.id, 'rejected'), child: const Text('Reject')),
                        ],
                      ),
                    ],
                  ),
                ),
              )
              .toList(),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed: $err')),
      ),
    );
  }

  Future<void> _decide(BuildContext context, WidgetRef ref, String reviewId, String decision) async {
    await ref.read(adminRepositoryProvider).decideReview(reviewId, decision);
    await ref.read(analyticsServiceProvider).logEvent('admin_review_decision', parameters: {'decision': decision});
    if (context.mounted) {
      ref.invalidate(adminReviewsProvider);
    }
  }
}
