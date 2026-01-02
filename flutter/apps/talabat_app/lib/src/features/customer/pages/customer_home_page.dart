import 'package:app_services/app_services.dart';
import 'package:design_system/design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

import '../controllers/customer_home_controller.dart';

class CustomerHomePage extends HookConsumerWidget {
  const CustomerHomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(customerHomeControllerProvider);
    final locationState = ref.watch(locationControllerProvider).state;
    final searchController = useTextEditingController(text: state.searchQuery);
    final flagAsync = ref.watch(featureFlagsProvider);
    final formatter = NumberFormat.currency(symbol: 'EGP ');
    useEffect(() {
      if (searchController.text != state.searchQuery) {
        searchController.text = state.searchQuery;
      }
      return null;
    }, [state.searchQuery]);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover'),
        actions: [
          IconButton(
            icon: const Icon(Icons.location_on_outlined),
            onPressed: () => context.push('/customer/addresses'),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/customer/profile'),
          ),
          IconButton(
            icon: const Icon(Icons.wallet),
            onPressed: () => context.push('/customer/wallet'),
          ),
          IconButton(
            icon: const Icon(Icons.shopping_cart_outlined),
            onPressed: () => context.push('/customer/cart'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(customerHomeControllerProvider.notifier).load(),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.all(TalabatColors.spacing.lg),
          children: [
            flagAsync.when(
              data: (flags) => flags.showCustomerBetaBanner
                  ? Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: TalabatCard(
                        child: Row(
                          children: [
                            const Icon(Icons.rocket_launch, color: Colors.orange),
                            const SizedBox(width: 8),
                            Expanded(child: Text('You are using the new Flutter beta experience. Send feedback anytime!')),
                          ],
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            TalabatCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Delivering to', style: Theme.of(context).textTheme.bodySmall),
                  Text(locationState.selectedAddress?.addressLine1 ?? 'Detecting...', style: Theme.of(context).textTheme.headlineSmall),
                  if (locationState.coords != null)
                    Text(
                      '${locationState.coords!.latitude.toStringAsFixed(4)}, ${locationState.coords!.longitude.toStringAsFixed(4)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () => ref.read(locationControllerProvider).refreshLocation(),
                      icon: const Icon(Icons.my_location, size: 16),
                      label: const Text('Refresh'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: searchController,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                hintText: 'Search restaurants or cuisines',
                border: const OutlineInputBorder(),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceVariant,
              ),
              onChanged: ref.read(customerHomeControllerProvider.notifier).setSearch,
            ),
            const SizedBox(height: 12),
            _QuickFilterChips(state: state),
            const SizedBox(height: 16),
            SizedBox(
              height: 96,
              child: state.loading && state.categories.isEmpty
                  ? const Center(child: TalabatSkeleton.rect(height: 80))
                  : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemBuilder: (context, index) {
                        final category = state.categories[index];
                        return TalabatCard(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(category.emoji, style: const TextStyle(fontSize: 24)),
                              const SizedBox(height: 4),
                              Text(category.name, style: Theme.of(context).textTheme.bodySmall),
                            ],
                          ),
                        );
                      },
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemCount: state.categories.length,
                    ),
            ),
            const SizedBox(height: 16),
            if (state.loading && state.filteredRestaurants.isEmpty)
              const TalabatSkeleton.rect(height: 180)
            else
              ...state.filteredRestaurants.map((restaurant) {
                final eta = computeEtaBand(
                  prepP50Minutes: 12,
                  prepP90Minutes: 20,
                  bufferMinutes: 4,
                  travelMinutes: restaurant.deliveryTime.round(),
                  reliabilityScore: restaurant.rating / 5,
                );
                final isFavorite = state.favoriteRestaurantIds.contains(restaurant.id);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TalabatCard(
                    child: InkWell(
                      onTap: () => context.push('/customer/restaurant/${restaurant.id}'),
                      child: Row(
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              image: DecorationImage(
                                image: NetworkImage(restaurant.image.isNotEmpty ? restaurant.image : 'https://picsum.photos/seed/${restaurant.id}/200/200'),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(child: Text(restaurant.name, style: Theme.of(context).textTheme.titleMedium)),
                                    IconButton(
                                      onPressed: () => ref.read(customerHomeControllerProvider.notifier).toggleFavorite(restaurant),
                                      icon: Icon(isFavorite ? Icons.favorite : Icons.favorite_border, color: isFavorite ? Theme.of(context).colorScheme.primary : null),
                                    ),
                                  ],
                                ),
                                Text('${restaurant.cuisine} • ${restaurant.rating.toStringAsFixed(1)} ★', style: Theme.of(context).textTheme.bodySmall),
                                const SizedBox(height: 4),
                                Text('${eta.etaLowMinutes}-${eta.etaHighMinutes} min • ${formatter.format(restaurant.deliveryFee)} delivery', style: Theme.of(context).textTheme.bodySmall),
                                if (eta.trusted)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text('TRUSTED ETA', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Theme.of(context).colorScheme.primary)),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _QuickFilterChips extends ConsumerWidget {
  const _QuickFilterChips({required this.state});

  final CustomerHomeState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = {
      'promoted': 'Promoted',
      'under15': 'Under 15 EGP delivery',
      'freeDelivery': 'Free Delivery',
    };
    return Wrap(
      spacing: 8,
      children: filters.entries
          .map(
            (entry) => ChoiceChip(
              label: Text(entry.value),
              selected: state.quickFilters.contains(entry.key),
              onSelected: (_) => ref.read(customerHomeControllerProvider.notifier).toggleQuickFilter(entry.key),
            ),
          )
          .toList(),
    );
  }
}
