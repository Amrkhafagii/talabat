import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import { router } from 'expo-router';

import SearchBar from '@/components/ui/SearchBar';
import CategoryCard from '@/components/customer/CategoryCard';
import RestaurantCard from '@/components/customer/RestaurantCard';
import { useFavorites } from '@/hooks/useFavorites';
import { categories, restaurants } from '@/constants/data';

export default function CustomerHome() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toggleFavorite, isFavorite } = useFavorites();

  const navigateToRestaurant = (restaurant: any) => {
    router.push({
      pathname: '/customer/restaurant',
      params: { restaurantId: restaurant.id, restaurantName: restaurant.name }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <MapPin size={20} color="#FF6B35" />
            <View style={styles.locationText}>
              <Text style={styles.deliverTo}>Deliver to</Text>
              <Text style={styles.address}>Downtown, City Center</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/customer/profile')}
          >
            <Text style={styles.profileInitial}>JD</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search restaurants, cuisines..."
          style={styles.searchContainer}
        />

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={() => console.log('Category pressed:', category.name)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Promoted Restaurants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promoted</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promotedContainer}>
            {restaurants.filter(r => r.promoted).map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                variant="promoted"
                onPress={() => navigateToRestaurant(restaurant)}
                onFavoritePress={() => toggleFavorite(restaurant.id)}
                isFavorite={isFavorite(restaurant.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* All Restaurants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Restaurants</Text>
            <TouchableOpacity onPress={() => router.push('/customer/orders')}>
              <Text style={styles.viewAll}>View Orders</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.restaurantsContainer}>
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onPress={() => navigateToRestaurant(restaurant)}
                onFavoritePress={() => toggleFavorite(restaurant.id)}
                isFavorite={isFavorite(restaurant.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 8,
  },
  deliverTo: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  address: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginVertical: 16,
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
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewAll: {
    fontSize: 14,
    color: '#FF6B35',
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
});