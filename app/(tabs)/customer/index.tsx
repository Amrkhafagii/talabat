import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import SearchBar from '@/components/ui/SearchBar';
import CategoryCard from '@/components/customer/CategoryCard';
import RestaurantCard from '@/components/customer/RestaurantCard';
import { Icon } from '@/components/ui/Icon';
import { useFavorites } from '@/hooks/useFavorites';
import { getCategories, getRestaurants } from '@/utils/database';
import { Category, Restaurant, RestaurantFilters } from '@/types/database';
import { useLocationContext } from '@/contexts/LocationContext';
import { computeEtaBand } from '@/utils/db/trustedArrival';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { BlockSkeleton, ListSkeleton } from '@/components/restaurant/Skeletons';

export default function CustomerHome() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toggleFavorite, isFavorite } = useFavorites();

  // Filter states
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxDeliveryFee, setMaxDeliveryFee] = useState<number>(50);
  const [showPromotedOnly, setShowPromotedOnly] = useState<boolean>(false);
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const { selectedAddress, coords } = useLocationContext();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const params = useLocalSearchParams();

  // Listen for filter changes from the filter screen
  useFocusEffect(
    React.useCallback(() => {
      if (params.selectedCuisines) {
        try {
          setSelectedCuisines(JSON.parse(params.selectedCuisines as string));
        } catch (e) {
          console.error('Error parsing selectedCuisines:', e);
        }
      }
      if (params.minRating) {
        setMinRating(parseFloat(params.minRating as string));
      }
      if (params.maxDeliveryFee) {
        setMaxDeliveryFee(parseFloat(params.maxDeliveryFee as string));
      }
      if (params.showPromotedOnly) {
        setShowPromotedOnly(params.showPromotedOnly === 'true');
      }
    }, [params])
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Construct filters
      const filters: RestaurantFilters = {
        search: searchQuery || undefined,
        cuisine: selectedCuisines.length > 0 ? selectedCuisines : undefined,
        rating: minRating > 0 ? minRating : undefined,
        deliveryFee: maxDeliveryFee < 50 ? maxDeliveryFee : undefined,
        promoted: showPromotedOnly ? true : undefined,
      };

      const [categoriesData, restaurantsData] = await Promise.all([
        getCategories(),
        getRestaurants(filters, {
          page: 0,
          pageSize: 50,
          lat: coords?.latitude,
          lng: coords?.longitude,
          maxDistanceKm: 20,
        })
      ]);

      setCategories(categoriesData);
      setRestaurants(restaurantsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [coords?.latitude, coords?.longitude, maxDeliveryFee, minRating, searchQuery, selectedCuisines, showPromotedOnly]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleQuickFilter = (key: string) => {
    setQuickFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const filteredRestaurants = useMemo(() => {
    let list = [...restaurants];

    if (quickFilters.includes('open')) {
      list = list.filter((r) => r.is_open);
    }
    if (quickFilters.includes('promoted')) {
      list = list.filter((r) => r.is_promoted);
    }
    if (quickFilters.includes('under15')) {
      list = list.filter((r) => Number(r.delivery_fee) <= 15);
    }
    if (quickFilters.includes('freeDelivery')) {
      list = list.filter((r) => Number(r.delivery_fee) === 0);
    }

    return list;
  }, [quickFilters, restaurants]);

  const navigateToRestaurant = (restaurant: Restaurant) => {
    router.push({
      pathname: '/customer/restaurant',
      params: { 
        restaurantId: restaurant.id, 
        restaurantName: restaurant.name 
      }
    });
  };

  const openFilters = () => {
    router.push('/customer/filters');
  };

  const promotedRestaurants = restaurants.filter(r => r.is_promoted);

  const computeRestaurantEta = (restaurant: Restaurant) => {
    const parsedDelivery = restaurant.delivery_time ? parseInt(restaurant.delivery_time, 10) : NaN;
    const travelMinutes = restaurant.distance_km
      ? Math.max(8, Math.round(restaurant.distance_km * 3.2))
      : 15;
    const prepP50 = !Number.isNaN(parsedDelivery) ? Math.max(10, Math.round(parsedDelivery * 0.4)) : 12;
    const prepP90 = !Number.isNaN(parsedDelivery) ? Math.max(prepP50 + 6, Math.round(parsedDelivery * 0.65)) : 20;
    const band = computeEtaBand({
      prepP50Minutes: prepP50,
      prepP90Minutes: prepP90,
      bufferMinutes: 4,
      travelMinutes,
      reliabilityScore: restaurant.rating ? Math.min(restaurant.rating / 5, 1) : 0.9,
      dataFresh: Boolean(restaurant.updated_at),
    });
    const tooWideOrStale = band.bandTooWide || band.dataStale;
    const fallbackLabel = restaurant.delivery_time ? `${restaurant.delivery_time} min` : 'ETA pending';
    return {
      label: tooWideOrStale ? fallbackLabel : `${band.etaLowMinutes}-${band.etaHighMinutes} min`,
      trusted: !tooWideOrStale && band.trusted,
    };
  };

  const renderLoading = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
      >
        <View style={styles.heroCard}>
          <BlockSkeleton width="60%" height={14} />
          <BlockSkeleton width="40%" height={12} style={{ marginTop: 8 }} />
          <View style={styles.heroActions}>
            <BlockSkeleton width={42} height={42} radius={20} />
            <BlockSkeleton width={42} height={42} radius={20} />
          </View>
        </View>
        <View style={styles.sectionPadding}>
          <BlockSkeleton width="100%" height={44} radius={14} />
          <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <BlockSkeleton key={idx} width={90} height={34} radius={18} />
            ))}
          </View>
        </View>
        <ListSkeleton rows={3} inset={20} />
      </ScrollView>
    </SafeAreaView>
  );

  if (loading) {
    return renderLoading();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.locationContainer}>
              <Icon name="MapPinFill" size="lg" color={theme.colors.primary[500]} />
              <View style={styles.locationText}>
                <Text style={styles.deliverTo}>Delivering to</Text>
                <Text style={styles.address}>
                  {selectedAddress
                    ? `${selectedAddress.label}${selectedAddress.city ? ` • ${selectedAddress.city}` : ''}`
                    : coords
                      ? `Current • ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`
                      : 'Choose location'}
                </Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroActionButton} onPress={openFilters}>
                <Icon name="Filter" size="md" color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroAvatar}
                onPress={() => router.push('/customer/profile')}
              >
                <Text style={styles.profileInitial}>JD</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.heroTitle}>Find food you’ll love today</Text>
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <Icon name="Star" size="sm" color={theme.colors.status.warning} />
              <Text style={styles.heroBadgeText}>Top rated nearby</Text>
            </View>
            <View style={styles.heroBadge}>
              <Icon name="Truck" size="sm" color={theme.colors.primary[500]} />
              <Text style={styles.heroBadgeText}>Fast delivery</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.sectionPadding}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Find food or restaurants..."
            style={styles.searchContainer}
          />

          {/* Quick filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFilters}
          >
            {[
              { id: 'open', label: 'Open Now', icon: 'Clock' },
              { id: 'promoted', label: 'Deals', icon: 'TagFill' },
              { id: 'under15', label: 'Under $15', icon: 'DollarSign' },
              { id: 'freeDelivery', label: 'Free Delivery', icon: 'Truck' },
            ].map((filter) => {
              const active = quickFilters.includes(filter.id);
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => toggleQuickFilter(filter.id)}
                >
                  <Icon
                    name={filter.icon as any}
                    size="sm"
                    color={active ? theme.colors.textInverse : theme.colors.text}
                  />
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Filters Indicator */}
          {(selectedCuisines.length > 0 || minRating > 0 || maxDeliveryFee < 50 || showPromotedOnly) && (
            <TouchableOpacity style={styles.activeFiltersContainer} onPress={openFilters}>
              <Text style={styles.activeFiltersText}>
                Filters active • {[
                  selectedCuisines.length > 0 && `${selectedCuisines.length} cuisine`,
                  minRating > 0 && `${minRating}★+`,
                  maxDeliveryFee < 50 && `Delivery < $${maxDeliveryFee}`,
                  showPromotedOnly && 'Promoted',
                ].filter(Boolean).join(' · ')}
              </Text>
              <Icon name="ChevronRight" size="md" color={theme.colors.primary[500]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity onPress={() => router.push('/customer/filters')}>
                <Text style={styles.viewAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={{
                    id: category.id,
                    name: category.name,
                    emoji: category.emoji
                  }}
                  onPress={() => setSelectedCuisines([category.name])}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Promoted Restaurants */}
        {promotedRestaurants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Today</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promotedContainer}>
              {promotedRestaurants.map((restaurant) => {
                const eta = computeRestaurantEta(restaurant);
                return (
                  <RestaurantCard
                    key={restaurant.id}
                    etaLabel={eta.label}
                    trusted={eta.trusted}
                    restaurant={{
                      id: restaurant.id,
                      name: restaurant.name,
                      cuisine: restaurant.cuisine,
                      rating: restaurant.rating,
                      deliveryTime: restaurant.delivery_time,
                      deliveryFee: restaurant.delivery_fee,
                      image: restaurant.image,
                      promoted: restaurant.is_promoted
                    }}
                    variant="promoted"
                    onPress={() => navigateToRestaurant(restaurant)}
                    onFavoritePress={() => toggleFavorite(restaurant.id)}
                    isFavorite={isFavorite(restaurant.id)}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* All Restaurants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Restaurants</Text>
            <TouchableOpacity onPress={() => router.push('/customer/orders')}>
              <Text style={styles.viewAll}>View Orders</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorCard}>
              <Icon name="AlertTriangle" size="lg" color={theme.colors.status.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.restaurantsContainer}>
            {filteredRestaurants.map((restaurant) => {
              const eta = computeRestaurantEta(restaurant);
              return (
                <RestaurantCard
                  key={restaurant.id}
                  etaLabel={eta.label}
                  trusted={eta.trusted}
                  restaurant={{
                    id: restaurant.id,
                    name: restaurant.name,
                    cuisine: restaurant.cuisine,
                    rating: restaurant.rating,
                    deliveryTime: restaurant.delivery_time,
                    deliveryFee: restaurant.delivery_fee,
                    image: restaurant.image,
                    promoted: restaurant.is_promoted
                  }}
                  onPress={() => navigateToRestaurant(restaurant)}
                  onFavoritePress={() => toggleFavorite(restaurant.id)}
                  isFavorite={isFavorite(restaurant.id)}
                />
              );
            })}
          </View>
          
          {filteredRestaurants.length === 0 && !error && (
            <View style={styles.emptyState}>
              <Icon name="Search" size="lg" color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No restaurants match yet</Text>
              <Text style={styles.emptyText}>Try adjusting filters or search to see more options nearby.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={openFilters}>
                <Text style={styles.retryButtonText}>Adjust Filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    sectionPadding: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    heroCard: {
      margin: 20,
      padding: 18,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.surface,
      ...theme.shadows.card,
      gap: 12,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    locationText: {
      marginLeft: 8,
    },
    deliverTo: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    address: {
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
    },
    heroActions: { flexDirection: 'row', gap: 12 },
    heroActionButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.primary[500],
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileInitial: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontFamily: 'Inter-Bold',
    },
    heroTitle: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
      lineHeight: 30,
    },
    heroBadges: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 14,
    },
    heroBadgeText: {
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      fontSize: 13,
    },
    searchContainer: {
      marginVertical: 12,
    },
    quickFilters: { gap: 10, paddingVertical: 4, paddingHorizontal: 4 },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterPillActive: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    filterPillText: {
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      fontSize: 13,
    },
    filterPillTextActive: {
      color: theme.colors.textInverse,
    },
    activeFiltersContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.primary[25] ?? theme.colors.primary[50],
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.primary[100],
    },
    activeFiltersText: {
      fontSize: 14,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-Medium',
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    viewAll: {
      fontSize: 14,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-Medium',
    },
    categoriesContainer: {
      paddingLeft: 20,
    },
    promotedContainer: {
      paddingLeft: 20,
    },
    restaurantsContainer: {
      paddingHorizontal: 20,
      gap: 12,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 24,
      gap: 10,
      backgroundColor: theme.colors.surface,
      marginHorizontal: 20,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
      lineHeight: 20,
    },
    errorCard: {
      backgroundColor: theme.colors.statusSoft.error,
      borderColor: theme.colors.status.error,
      borderWidth: 1,
      padding: 16,
      marginHorizontal: 20,
      borderRadius: theme.radius.card,
      gap: 10,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
    },
    retryButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
  });
