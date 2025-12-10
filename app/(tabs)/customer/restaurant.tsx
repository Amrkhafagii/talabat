import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import Header from '@/components/ui/Header';
import SearchBar from '@/components/ui/SearchBar';
import MenuItem from '@/components/customer/MenuItem';
import { Icon } from '@/components/ui/Icon';
import { useCart } from '@/hooks/useCart';
import { getRestaurantById, getMenuItemsByRestaurant } from '@/utils/database';
import { Restaurant, MenuItem as MenuItemType } from '@/types/database';
import { isRestaurantOpenNow } from '@/utils/hours';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { wp } from '@/styles/responsive';
import { formatCurrency } from '@/utils/formatters';

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
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const restaurantId = params.restaurantId as string;
  const categoriesFromMenu = useMemo(() => {
    const unique = Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean)));
    const base = ['All', 'Popular', ...unique];
    return base.length > 1 ? base : baseCategories;
  }, [menuItems]);

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
        getMenuItemsByRestaurant(restaurantId, filters),
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
      const item = menuItems.find((menu) => menu.id === itemId);
      return total + (item ? item.price * quantity : 0);
    }, 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Loading..." showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
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

  const isClosed = !restaurant.is_open || !isRestaurantOpenNow(restaurant.restaurant_hours);
  const heroImage = (restaurant as any).cover_image || restaurant.image;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrapper}>
          <ImageBackground source={{ uri: heroImage }} style={styles.heroImage}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroTopBar}>
              <TouchableOpacity style={styles.heroIconButton} onPress={() => router.back()}>
                <Icon name="ArrowBack" size="lg" color={theme.colors.textInverse} />
              </TouchableOpacity>
              <View style={styles.heroTopActions}>
                <TouchableOpacity style={styles.heroIconButton} onPress={() => setMenuSearchQuery('')}>
                  <Icon name="Search" size="lg" color={theme.colors.textInverse} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroIconButton}
                  onPress={() =>
                    Share.share({
                      title: restaurant.name,
                      message: `Check out ${restaurant.name} on Talabat`,
                    })
                  }
                >
                  <Icon name="Upload" size="lg" color={theme.colors.textInverse} />
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                <Text style={styles.restaurantCuisine}>
                  {restaurant.cuisine} • {restaurant.delivery_time} min • $
                  {restaurant.delivery_fee.toFixed(2)} fee
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <Icon name="Star" size="sm" color={theme.colors.textInverse} />
                <Text style={styles.ratingBadgeText}>{restaurant.rating.toFixed(1)}</Text>
              </View>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={styles.metaPill}>
                <Icon name="Clock" size="sm" color={theme.colors.primary[500]} />
                <Text style={styles.metaPillText}>{restaurant.delivery_time} min</Text>
              </View>
              <View style={styles.metaPill}>
                <Icon name="Truck" size="sm" color={theme.colors.primary[500]} />
                <Text style={styles.metaPillText}>
                  {restaurant.delivery_fee === 0 ? 'Free delivery' : `$${restaurant.delivery_fee.toFixed(2)} delivery`}
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Icon name="ShieldCheck" size="sm" color={theme.colors.status.success} />
                <Text style={styles.metaPillText}>Quality checked</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Closed banner */}
        {isClosed && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedTitle}>Currently Closed</Text>
            <Text style={styles.closedSubtitle}>Please check back during opening hours.</Text>
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
            {categoriesFromMenu.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.categoryTab, selectedCategory === category && styles.selectedTab]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category && styles.selectedTabText,
                  ]}
                >
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
                popular: item.is_popular,
                available: item.is_available,
              }}
              quantity={cart[item.id] || 0}
              onAdd={() => addToCart(item.id)}
              onRemove={() => removeFromCart(item.id)}
              disabled={isClosed || !item.is_available}
              unavailableReason={!item.is_available ? 'Sold out' : undefined}
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
            style={[styles.cartButton, isClosed && styles.cartButtonDisabled]}
            onPress={() => {
              if (isClosed) return;
              router.push('/customer/cart');
            }}
            disabled={isClosed}
          >
            <View style={styles.cartInfo}>
              <Icon name="ShoppingCart" size="md" color={theme.colors.textInverse} />
              <Text style={styles.cartCount}>{getTotalItems()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cartText}>
                {isClosed ? 'Closed' : 'View Cart'}
              </Text>
              <Text style={styles.cartSubtitle}>Items ready in ~{restaurant.delivery_time} min</Text>
            </View>
            <Text style={styles.cartTotal}>{formatCurrency(getCartTotalForItems())}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
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
    heroWrapper: { marginBottom: 8 },
    heroImage: {
      width: '100%',
      height: 260,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.28)',
    },
    heroTopBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    heroTopActions: { flexDirection: 'row', gap: 10 },
    heroIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroCard: {
      marginHorizontal: 16,
      marginTop: -26,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      ...theme.shadows.card,
      gap: 12,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    restaurantName: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    restaurantCuisine: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginBottom: 8,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 14,
      gap: 6,
    },
    ratingBadgeText: {
      color: theme.colors.textInverse,
      fontFamily: 'Inter-SemiBold',
    },
    heroMetaRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceAlt,
    },
    metaPillText: {
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      fontSize: 13,
    },
    searchSection: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginBottom: 8,
    },
    menuSearchBar: {
      margin: 0,
    },
    categoryTabs: {
      backgroundColor: theme.colors.surface,
      paddingVertical: 16,
      marginBottom: 8,
    },
    categoryTab: {
      paddingHorizontal: Math.max(theme.spacing.sm, wp('4%')),
      paddingVertical: 10,
      marginHorizontal: 6,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedTab: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    categoryTabText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: theme.colors.textMuted,
    },
    selectedTabText: {
      color: theme.colors.textInverse,
    },
    menuItems: {
      backgroundColor: theme.colors.surface,
      paddingTop: 8,
    },
    emptyCategory: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyCategoryText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    cartButtonContainer: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    cartButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 16,
      ...theme.shadows.raised,
      gap: 12,
    },
    cartInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cartCount: {
      fontSize: 14,
      fontFamily: 'Inter-Bold',
      color: theme.colors.textInverse,
      marginLeft: 8,
    },
    cartText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.textInverse,
    },
    cartSubtitle: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textInverse,
      opacity: 0.9,
    },
    cartTotal: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: theme.colors.textInverse,
    },
    cartButtonDisabled: {
      backgroundColor: theme.colors.borderMuted,
    },
    closedBanner: {
      backgroundColor: theme.colors.statusSoft.error,
      borderColor: theme.colors.status.error,
      borderWidth: 1,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 12,
      padding: 12,
    },
    closedTitle: {
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.status.error,
      fontSize: 14,
      marginBottom: 4,
    },
    closedSubtitle: {
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
      fontSize: 12,
    },
  });
