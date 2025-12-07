import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Switch, I18nManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import SearchBar from '@/components/ui/SearchBar';
import MenuItemManagementCard from '@/components/restaurant/MenuItemManagementCard';
import Button from '@/components/ui/Button';
import FAB from '@/components/ui/FAB';
import Chip from '@/components/ui/Chip';
import Snackbar from '@/components/ui/Snackbar';
import { BlockSkeleton, ListSkeleton } from '@/components/restaurant/Skeletons';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ensureRestaurantForUser, 
  getMenuItemsByRestaurant, 
  getCategories,
  updateMenuItem,
  deleteMenuItem,
} from '@/utils/database';
import { Restaurant, MenuItem, Category } from '@/types/database';
import { ensureOwnership, shouldRefetchOnFocus } from '@/utils/menuOrdering';
import { logMutationError } from '@/utils/telemetry';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

const baseCategoryFilters = ['All', 'Popular'];

export default function MenuManagement() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyPopular, setOnlyPopular] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const prevIdsRef = useRef<string[]>([]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (shouldRefetchOnFocus(user?.id, restaurant?.id)) {
        loadMenuItems((restaurant as Restaurant).id);
      }
    }, [user, restaurant])
  );

  useEffect(() => {
    filterMenuItems();
  }, [menuItems, searchQuery, selectedCategory, onlyAvailable, onlyPopular]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const restaurantData = await ensureRestaurantForUser(user.id);
      if (!restaurantData) {
        setError('No restaurant found for this user');
        return;
      }
      const categoriesData = await getCategories(restaurantData.id);

      setRestaurant(restaurantData);
      setCategories(categoriesData);
      if (categoriesData.length > 0 && selectedCategory === 'All') {
        setSelectedCategory('All');
      }

      // Load menu items
      await loadMenuItems(restaurantData.id);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load menu data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async (restaurantId: string) => {
    try {
      const items = await getMenuItemsByRestaurant(restaurantId);
      setMenuItems(items);
      const prevIds = prevIdsRef.current;
      const newId = items.find(i => !prevIds.includes(i.id))?.id;
      if (newId) {
        setHighlightId(newId);
        setTimeout(() => setHighlightId(null), 2500);
      }
      prevIdsRef.current = items.map(i => i.id);
    } catch (err) {
      console.error('Error loading menu items:', err);
    }
  };

  const handleRefresh = async () => {
    if (!restaurant) return;
    
    setRefreshing(true);
    await loadMenuItems(restaurant.id);
    setRefreshing(false);
  };

  const filterMenuItems = () => {
    let filtered = [...menuItems];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Popular') {
        filtered = filtered.filter(item => item.is_popular);
      } else {
        filtered = filtered.filter(item => item.category === selectedCategory || item.category_id === selectedCategory);
      }
    }

    if (onlyAvailable) {
      filtered = filtered.filter(item => item.is_available);
    }
    if (onlyPopular) {
      filtered = filtered.filter(item => item.is_popular);
    }

    setFilteredItems(filtered);
  };

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    if (!restaurant) {
      Alert.alert('Error', 'No restaurant found for this account');
      return;
    }

    const item = menuItems.find(i => i.id === itemId);
    if (!item || !ensureOwnership(restaurant.id, item.restaurant_id)) {
      Alert.alert('Unauthorized', 'You can only update items from your restaurant.');
      return;
    }

    const previous = menuItems;
    setMenuItems(prev => prev.map(item => item.id === itemId ? { ...item, is_available: !isAvailable } : item));

    try {
      const { success, error, errorCode } = await updateMenuItem(itemId, { is_available: !isAvailable }, restaurant.id);

      if (success) {
        showToast(!isAvailable ? 'Item marked available' : 'Item marked unavailable');
      } else {
        setMenuItems(previous);
        const friendly = errorCode === '42501'
          ? 'You cannot update items you do not own.'
          : 'Failed to update item availability';
        logMutationError('menu.updateAvailability.failed', { itemId, error, errorCode });
        Alert.alert('Error', friendly);
      }
    } catch (err) {
      console.error('Error updating availability:', err);
      logMutationError('menu.updateAvailability.failed', { itemId, err: String(err) });
      setMenuItems(previous);
      Alert.alert('Error', 'Failed to update item availability');
    }
  };

  const handleTogglePopular = async (itemId: string, isPopular: boolean) => {
    if (!restaurant) {
      Alert.alert('Error', 'No restaurant found for this account');
      return;
    }

    const item = menuItems.find(i => i.id === itemId);
    if (!item || !ensureOwnership(restaurant.id, item.restaurant_id)) {
      Alert.alert('Unauthorized', 'You can only update items from your restaurant.');
      return;
    }

    const previous = menuItems;
    setMenuItems(prev => prev.map(item => item.id === itemId ? { ...item, is_popular: !isPopular } : item));

    try {
      const { success, error, errorCode } = await updateMenuItem(itemId, { is_popular: !isPopular }, restaurant.id);

      if (success) {
        showToast(!isPopular ? 'Item marked popular' : 'Item unmarked popular');
      } else {
        setMenuItems(previous);
        const friendly = errorCode === '42501'
          ? 'You cannot update items you do not own.'
          : 'Failed to update popular status';
        logMutationError('menu.updatePopular.failed', { itemId, error, errorCode });
        Alert.alert('Error', friendly);
      }
    } catch (err) {
      console.error('Error updating popular status:', err);
      logMutationError('menu.updatePopular.failed', { itemId, err: String(err) });
      setMenuItems(previous);
      Alert.alert('Error', 'Failed to update popular status');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    router.push({
      pathname: '/(tabs)/restaurant/menu-item/edit',
      params: { itemId: item.id }
    } as any);
  };

  const handleDeleteItem = (item: MenuItem) => {
    Alert.alert(
      'Delete Menu Item',
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!restaurant) {
                Alert.alert('Error', 'No restaurant found for this account');
                return;
              }

              const { success, error } = await deleteMenuItem(item.id, restaurant.id);

              if (success) {
                setMenuItems(prev => prev.filter(i => i.id !== item.id));
                showToast('Item deleted');
              } else {
                Alert.alert('Error', error || 'Failed to delete menu item');
              }
            } catch (err) {
              console.error('Error deleting item:', err);
              logMutationError('menu.delete.failed', { itemId: item.id, err: String(err) });
              Alert.alert('Error', 'Failed to delete menu item');
            }
          }
        }
      ]
    );
  };

  const addNewItem = () => {
    router.push('/(tabs)/restaurant/menu-item/add' as any);
  };

  const showToast = (message: string) => {
    setToast(message);
  };

  const derivedCategoryFilters = [
    ...baseCategoryFilters,
    ...categories.map((c) => c.id),
  ];

  const getCategoryLabel = (value: string) => {
    if (value === 'All' || value === 'Popular') return value;
    const cat = categories.find((c) => c.id === value);
    if (!cat) return value;
    const scope = cat.restaurant_id ? 'Your restaurant' : 'Global';
    return `${cat.name} • ${scope}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor={theme.colors.background} />
        <Header title="Menu Management" showBackButton />
        <View style={styles.loadingContainer}>
          <BlockSkeleton width="82%" height={20} />
          <BlockSkeleton width="100%" height={44} radius={theme.radius.pill} style={{ marginTop: theme.spacing.md }} />
          <ListSkeleton rows={3} inset={theme.spacing.lg} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor={theme.colors.background} />
        <Header title="Menu Management" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Restaurant not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData} hitSlop={theme.tap.hitSlop}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <Header 
        title="Menu Management" 
        showBackButton 
        rightComponent={<RealtimeIndicator />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for a dish..."
            style={styles.searchBar}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {derivedCategoryFilters.map((categoryValue) => (
            <Chip
              key={categoryValue}
              label={getCategoryLabel(categoryValue)}
              active={selectedCategory === categoryValue}
              onPress={() => setSelectedCategory(categoryValue)}
              style={{ marginRight: 0 }}
            />
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.manageCategoriesLink}
          onPress={() => router.push('/(tabs)/restaurant/category-manager' as any)}
          hitSlop={theme.tap.hitSlop}
        >
          <Text style={styles.manageCategoriesText}>Manage categories</Text>
        </TouchableOpacity>

        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleTitle}>Only Available</Text>
            <Text style={styles.toggleSubtitle}>Display only available items</Text>
          </View>
          <Switch
            value={onlyAvailable}
            onValueChange={setOnlyAvailable}
            trackColor={{ false: theme.colors.borderMuted, true: theme.colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleTitle}>Only Popular</Text>
            <Text style={styles.toggleSubtitle}>Display only popular items</Text>
          </View>
          <Switch
            value={onlyPopular}
            onValueChange={setOnlyPopular}
            trackColor={{ false: theme.colors.borderMuted, true: theme.colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        {filteredItems.length > 0 ? (
          <View style={styles.itemsList}>
            {filteredItems.map((item) => (
              <MenuItemManagementCard
                key={item.id}
                item={{
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  image: item.image,
                  category: item.category_info?.name || item.category,
                  isPopular: item.is_popular,
                  isAvailable: item.is_available,
                  isScheduled: Boolean(item.available_start_time || item.available_end_time),
                  availabilityLabel: item.available_start_time && item.available_end_time
                    ? `${item.available_start_time} - ${item.available_end_time}`
                    : item.available_start_time || item.available_end_time || undefined,
                  preparationTime: item.preparation_time,
                  highlight: highlightId === item.id,
                  photoStatus: item.photo_approval_status,
                  photoNote: item.photo_approval_notes ?? null,
                }}
                onEdit={() => handleEditItem(item)}
                onDelete={() => handleDeleteItem(item)}
                onToggleAvailability={() => handleToggleAvailability(item.id, item.is_available)}
                onTogglePopular={() => handleTogglePopular(item.id, item.is_popular)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedCategory !== 'All' 
                ? 'No items match your filters' 
                : 'No menu items yet'
              }
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Start building your menu by adding your first item'
              }
            </Text>
            {(!searchQuery && selectedCategory === 'All') && (
              <Button
                title="Add First Item"
                onPress={addNewItem}
                style={styles.emptyButton}
              />
            )}
            {(searchQuery || selectedCategory !== 'All') && (
              <Button
                title="Clear filters"
                onPress={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                variant="outline"
              />
            )}
          </View>
        )}
      </ScrollView>
      <FAB
        icon={<Plus size={theme.iconSizes.md} strokeWidth={theme.icons.strokeWidth} color="#FFFFFF" />}
        onPress={addNewItem}
        style={styles.fab}
      />
      {toast ? (
        <Snackbar visible message={toast} onClose={() => setToast(null)} type="info" style={styles.toast} />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const isCompact = theme.device.isSmallScreen;
  const horizontal = isCompact ? theme.spacing.md : theme.spacing.lg;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background, writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
    loadingText: { ...theme.typography.body, color: theme.colors.secondaryText, marginTop: theme.spacing.sm },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
    errorText: { ...theme.typography.body, color: theme.colors.status.error, textAlign: 'center', marginBottom: theme.spacing.md },
    retryButton: { backgroundColor: theme.colors.accent, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md },
    retryButtonText: { ...theme.typography.button, color: '#FFFFFF' },
    searchSection: { paddingHorizontal: horizontal, paddingTop: theme.spacing.md },
    searchBar: { margin: 0 },
    chipsRow: { paddingHorizontal: horizontal, paddingVertical: theme.spacing.sm, columnGap: theme.spacing.sm },
    manageCategoriesLink: { paddingHorizontal: horizontal, paddingBottom: theme.spacing.sm },
    manageCategoriesText: { ...theme.typography.caption, color: theme.colors.accent, fontFamily: 'Inter-SemiBold' },
    toggleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      marginHorizontal: horizontal,
      marginTop: theme.spacing.sm,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    toggleTitle: { ...theme.typography.subhead },
    toggleSubtitle: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 2 },
    scrollContent: { paddingBottom: theme.insets.bottom + theme.spacing.xl },
    itemsList: { paddingHorizontal: horizontal, paddingTop: theme.spacing.md, rowGap: theme.spacing.sm, paddingBottom: theme.spacing.xl },
    emptyState: { alignItems: 'center', paddingVertical: theme.spacing.xl2, paddingHorizontal: theme.spacing.xl },
    emptyTitle: { ...theme.typography.title2, marginBottom: theme.spacing.xs, textAlign: 'center' },
    emptyText: { ...theme.typography.body, color: theme.colors.secondaryText, textAlign: 'center', lineHeight: 24, marginBottom: theme.spacing.lg },
    emptyButton: { marginTop: theme.spacing.sm },
    fab: { position: 'absolute', right: theme.spacing.lg, bottom: theme.insets.bottom + theme.spacing.lg },
    toast: { position: 'absolute', bottom: theme.insets.bottom + theme.spacing.md, left: theme.spacing.lg, right: theme.spacing.lg },
  });
}
