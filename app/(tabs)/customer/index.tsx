import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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
import { useAppTheme } from '@/styles/appTheme';

export default function CustomerHome() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toggleFavorite, isFavorite } = useFavorites();

  // Filter states
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxDeliveryFee, setMaxDeliveryFee] = useState<number>(50);
  const [showPromotedOnly, setShowPromotedOnly] = useState<boolean>(false);
  const { selectedAddress, coords } = useLocationContext();
  const theme = useAppTheme();
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

  useEffect(() => {
    loadData();
  }, [selectedCuisines, minRating, maxDeliveryFee, showPromotedOnly, searchQuery]);

  const loadData = async () => {
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
  };

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <Icon name="MapPin" size="md" color={theme.colors.primary[500]} />
            <View style={styles.locationText}>
              <Text style={styles.deliverTo}>Deliver to</Text>
              <Text style={styles.address}>
                {selectedAddress
                  ? selectedAddress.label
                  : coords
                    ? `Current: ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`
                    : 'Choose location'}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
              <Icon name="Filter" size="md" color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => router.push('/customer/profile')}
            >
              <Text style={styles.profileInitial}>JD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search restaurants, cuisines..."
          style={styles.searchContainer}
        />

        {/* Active Filters Indicator */}
        {(selectedCuisines.length > 0 || minRating > 0 || maxDeliveryFee < 50 || showPromotedOnly) && (
            <View style={styles.activeFiltersContainer}>
              <Text style={styles.activeFiltersText}>
              Filters active ({
                [
                  selectedCuisines.length > 0 && 'Cuisine',
                  minRating > 0 && 'Rating',
                  maxDeliveryFee < 50 && 'Delivery Fee',
                  showPromotedOnly && 'Promoted'
                ].filter(Boolean).join(', ')
              })
            </Text>
            <TouchableOpacity onPress={openFilters}>
              <Text style={styles.editFiltersText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={{
                    id: category.id,
                    name: category.name,
                    emoji: category.emoji
                  }}
                  onPress={() => console.log('Category pressed:', category.name)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Promoted Restaurants */}
        {promotedRestaurants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Promoted</Text>
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
          <View style={styles.restaurantsContainer}>
            {restaurants.map((restaurant) => {
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
          
          {restaurants.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No restaurants found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 12,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary[500],
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileInitial: {
      color: theme.colors.textInverse,
      fontSize: 16,
      fontFamily: 'Inter-Bold',
    },
    searchContainer: {
      marginHorizontal: 20,
      marginVertical: 16,
    },
    activeFiltersContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.primary[100],
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary[500],
    },
    activeFiltersText: {
      fontSize: 14,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-Medium',
    },
    editFiltersText: {
      fontSize: 14,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-SemiBold',
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
      paddingHorizontal: 20,
      marginBottom: 16,
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
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
  });
