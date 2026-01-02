import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

final restaurantProvider = FutureProvider.family<RestaurantModel?, String>((ref, id) async {
  return ref.watch(customerRepositoryProvider).fetchRestaurant(id);
});

final menuProvider = FutureProvider.family<List<MenuItemModel>, String>((ref, id) async {
  final repo = ref.watch(customerRepositoryProvider);
  return repo.fetchMenuItems(id);
});

class RestaurantDetailPage extends ConsumerWidget {
  const RestaurantDetailPage({super.key, required this.restaurantId});

  final String restaurantId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final restaurantAsync = ref.watch(restaurantProvider(restaurantId));
    final menuAsync = ref.watch(menuProvider(restaurantId));
    final cart = ref.watch(cartControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(restaurantAsync.value?.name ?? 'Restaurant'),
        actions: [
          IconButton(
            icon: const Icon(Icons.shopping_cart_outlined),
            onPressed: () => context.push('/customer/cart'),
          ),
        ],
      ),
      body: restaurantAsync.when(
        data: (restaurant) {
          if (restaurant == null) {
            return const Center(child: Text('Restaurant unavailable'));
          }
          return ListView(
            padding: EdgeInsets.all(TalabatColors.spacing.lg),
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Image.network(restaurant.image.isNotEmpty ? restaurant.image : 'https://picsum.photos/seed/${restaurant.id}/800/400', height: 200, fit: BoxFit.cover),
              ),
              const SizedBox(height: 12),
              Text(restaurant.name, style: Theme.of(context).textTheme.displaySmall),
              Text('${restaurant.cuisine} • ${restaurant.rating.toStringAsFixed(1)} ★', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 16),
              Text('Menu', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              menuAsync.when(
                data: (items) => Column(
                  children: items
                      .map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: TalabatCard(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item.name, style: Theme.of(context).textTheme.titleMedium),
                                      Text(item.description, style: Theme.of(context).textTheme.bodySmall),
                                      const SizedBox(height: 8),
                                      Text('EGP ${item.price.toStringAsFixed(2)}', style: Theme.of(context).textTheme.titleSmall),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                TalabatButton(
                                  label: 'Add',
                                  onPressed: () => ref.read(cartControllerProvider.notifier).addItem(item),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
                loading: () => const TalabatSkeleton.rect(height: 120),
                error: (err, _) => Text(err.toString()),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text(err.toString())),
      ),
      bottomNavigationBar: cart.items.isEmpty
          ? null
          : Padding(
              padding: EdgeInsets.all(TalabatColors.spacing.md),
              child: TalabatButton(
                label: 'View cart (${cart.items.length} items)',
                onPressed: () => context.push('/customer/cart'),
              ),
            ),
    );
  }
}
