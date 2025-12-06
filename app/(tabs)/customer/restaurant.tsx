import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Clock, ShoppingCart } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import Header from '@/components/ui/Header';
import SearchBar from '@/components/ui/SearchBar';
import MenuItem from '@/components/customer/MenuItem';
import { useCart } from '@/hooks/useCart';
import { getRestaurantById, getMenuItemsByRestaurant } from '@/utils/database';
import { Restaurant, MenuItem as MenuItemType } from '@/types/database';
import { isRestaurantOpenNow } from '@/utils/hours';

const baseCategories = ['All', 'Popular', 'Mains', 'Sides', 'Beverages', 'Desserts'];

export default function RestaurantDetail() {
  const params = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cart, addToCart, removeFromCart, getTotalItems } = useCart();

  const restaurantId = params.restaurantId as string;

  useEffect(() => {
    if (restaurantId) {
      loadRestaurantData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, selectedCategory, menuSearchQuery]);

  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: any = { available: true, approvedImagesOnly: true };
      if (selectedCategory === 'Popular') {
        filters.popular = true;
      } else if (selectedCategory !== 'All') {
        filters.category = selectedCategory;
      }
      if (menuSearchQuery) {
        filters.search = menuSearchQuery;
      }

      const [restaurantData, menuData] = await Promise.all([
        getRestaurantById(restaurantId),
        getMenuItemsByRestaurant(restaurantId, filters)
      ]);

      if (!restaurantData) {
        setError('Restaurant not found');
        return;
      }

      setRestaurant(restaurantData);
      setMenuItems(menuData);
    } catch (err) {
      console.error('Error loading restaurant data:', err);
      setError('Failed to load restaurant data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCartTotalForItems = () => {
    return Object.entries(cart).reduce((total, [itemId, quantity]) => {
      const item = menuItems.find(item => item.id === itemId);
      return total + (item ? item.price * quantity : 0);
    }, 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Loading..." showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading restaurant...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Error" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Restaurant not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRestaurantData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={restaurant.name}
        showBackButton
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantInfo}>
          <Image 
            source={{ uri: restaurant.image }} 
            style={styles.restaurantImage} 
          />
          <View style={styles.restaurantDetails}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
            <View style={styles.restaurantMeta}>
              <View style={styles.rating}>
                <Star size={16} color="#FFB800" fill="#FFB800" />
                <Text style={styles.ratingText}>{restaurant.rating}</Text>
              </View>
              <View style={styles.delivery}>
                <Clock size={16} color="#6B7280" />
                <Text style={styles.deliveryText}>{restaurant.delivery_time} min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Closed banner */}
        {(!restaurant.is_open || !isRestaurantOpenNow(restaurant.restaurant_hours)) && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedTitle}>Currently Closed</Text>
            <Text style={styles.closedSubtitle}>
              Please check back during opening hours.
            </Text>
          </View>
        )}

        {/* Menu Search */}
        <View style={styles.searchSection}>
          <SearchBar
            value={menuSearchQuery}
            onChangeText={setMenuSearchQuery}
            placeholder="Search menu items..."
            style={styles.menuSearchBar}
          />
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {baseCategories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.selectedTab
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.selectedTabText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Menu Items */}
        <View style={styles.menuItems}>
          {menuItems.map((item) => (
            <MenuItem
              key={item.id}
              item={{
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                image: item.image,
                popular: item.is_popular
              }}
              quantity={cart[item.id] || 0}
              onAdd={() => addToCart(item.id)}
              onRemove={() => removeFromCart(item.id)}
              disabled={!restaurant.is_open || !isRestaurantOpenNow(restaurant.restaurant_hours)}
            />
          ))}
          
          {menuItems.length === 0 && (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryText}>
                {menuSearchQuery ? 'No items match your search' : 'No items in this category'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cart Button */}
      {getTotalItems() > 0 && (
        <View style={styles.cartButtonContainer}>
          <TouchableOpacity 
            style={[styles.cartButton, (!restaurant.is_open || !isRestaurantOpenNow(restaurant.restaurant_hours)) && styles.cartButtonDisabled]}
            onPress={() => {
              if (!restaurant.is_open || !isRestaurantOpenNow(restaurant.restaurant_hours)) return;
              router.push('/customer/cart');
            }}
            disabled={!restaurant.is_open || !isRestaurantOpenNow(restaurant.restaurant_hours)}
          >
            <View style={styles.cartInfo}>
              <ShoppingCart size={20} color="#FFFFFF" />
              <Text style={styles.cartCount}>{getTotalItems()}</Text>
            </View>
            <Text style={styles.cartText}>
              {!restaurant.is_open || !isRestaurantOpenNow(restaurant.restaurant_hours) ? 'Closed' : 'View Cart'}
            </Text>
            <Text style={styles.cartTotal}>${getCartTotalForItems().toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  restaurantInfo: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  restaurantImage: {
    width: '100%',
    height: 200,
  },
  restaurantDetails: {
    padding: 20,
  },
  restaurantName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  ratingText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 4,
    fontFamily: 'Inter-Medium',
  },
  delivery: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
    fontFamily: 'Inter-Regular',
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  menuSearchBar: {
    margin: 0,
  },
  categoryTabs: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginBottom: 8,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  selectedTab: {
    backgroundColor: '#FF6B35',
  },
  categoryTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  selectedTabText: {
    color: '#FFFFFF',
  },
  menuItems: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
  },
  emptyCategory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyCategoryText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  cartButtonContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartCount: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cartText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cartTotal: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  cartButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  closedBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
  },
  closedTitle: {
    fontFamily: 'Inter-SemiBold',
    color: '#B91C1C',
    fontSize: 14,
    marginBottom: 4,
  },
  closedSubtitle: {
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    fontSize: 12,
  },
});
