import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:uuid/uuid.dart';

final restaurantCategoriesProvider = FutureProvider.family<List<RestaurantCategory>, String>((ref, restaurantId) {
  return ref.watch(restaurantRepositoryProvider).fetchCategories(restaurantId);
});

class CategoryManagerPage extends HookConsumerWidget {
  const CategoryManagerPage({super.key, this.restaurantIdOverride});

  final String? restaurantIdOverride;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final restaurantId = restaurantIdOverride ?? (auth.user?.appMetadata['restaurant_id'] as String?) ?? auth.user?.id;
    if (restaurantId == null) {
      return const Scaffold(body: Center(child: Text('Restaurant not found')));
    }
    final categoriesAsync = ref.watch(restaurantCategoriesProvider(restaurantId));
    final analytics = ref.watch(analyticsServiceProvider);

    Future<void> addCategory() async {
      final controller = TextEditingController();
      final result = await showDialog<String>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Add category'),
          content: TextField(controller: controller, decoration: const InputDecoration(labelText: 'Name')),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Save')),
          ],
        ),
      );
      if (result == null || result.isEmpty) return;
      await ref.read(restaurantRepositoryProvider).upsertCategory(
            RestaurantCategory(id: const Uuid().v4(), name: result, sortOrder: categoriesAsync.value?.length ?? 0),
            restaurantId,
          );
      await analytics.logEvent('category_updated', parameters: {'restaurant_id': restaurantId});
      ref.invalidate(restaurantCategoriesProvider(restaurantId));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Category manager'),
        actions: [IconButton(onPressed: addCategory, icon: const Icon(Icons.add))],
      ),
      body: categoriesAsync.when(
        data: (categories) => ReorderableListView.builder(
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          itemBuilder: (context, index) {
            final category = categories[index];
            return ListTile(
              key: ValueKey(category.id),
              title: Text(category.name),
              leading: const Icon(Icons.drag_indicator),
            );
          },
          itemCount: categories.length,
          onReorder: (oldIndex, newIndex) async {
            final updated = [...categories];
            final removed = updated.removeAt(oldIndex);
            final insertIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
            updated.insert(insertIndex, removed);
            await ref.read(restaurantRepositoryProvider).reorderCategories(updated.map((e) => e.id).toList());
            await analytics.logEvent('category_updated', parameters: {'restaurant_id': restaurantId, 'reordered': true});
            ref.invalidate(restaurantCategoriesProvider(restaurantId));
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Failed to load categories: $err')),
      ),
    );
  }
}
