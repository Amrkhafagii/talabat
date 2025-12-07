import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, TextInput, Animated, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Plus, Filter, ArrowUp, ArrowDown, Trash2, X, GripVertical } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import SearchBar from '@/components/ui/SearchBar';
import MenuItemManagementCard from '@/components/restaurant/MenuItemManagementCard';
import Button from '@/components/ui/Button';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ensureRestaurantForUser, 
  getMenuItemsByRestaurant, 
  getCategories,
  createCategory,
  reorderCategories,
  updateCategory,
  updateMenuItem,
  deleteMenuItem,
  deleteCategory
} from '@/utils/database';
import { Restaurant, MenuItem, Category } from '@/types/database';
import { reorderCategoryList, ensureOwnership, shouldRefetchOnFocus } from '@/utils/menuOrdering';
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
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const prevIdsRef = useRef<string[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [pendingCategories, setPendingCategories] = useState<Category[] | null>(null);

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
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 1200);
    });
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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      Alert.alert('Duplicate', 'Category name already exists.');
      return;
    }
    const { category, errorCode, errorMessage } = await createCategory({
      name: newCategoryName.trim(),
      emoji: '🍽️',
      description: '',
      restaurant_id: restaurant?.id ?? null,
      is_active: true,
      sort_order: (categories[categories.length - 1]?.sort_order || 0) + 1,
    });
    if (category) {
      setCategories((prev) => [...prev, category]);
      setSelectedCategory(category.id);
      setNewCategoryName('');
      showToast('Category added');
    } else {
      const friendly = errorCode === '42501'
        ? 'You do not have permission to create categories for this restaurant.'
        : 'Could not create category';
      logMutationError('category.create.failed', { errorCode, errorMessage });
      Alert.alert('Error', friendly);
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const reordered = reorderCategoryList<Category>(categories, index, direction);
    if (reordered === categories) return;
    setPendingCategories(categories);
    setCategories(reordered);
    const ok = await reorderCategories(reordered.map((c) => ({ id: c.id, sort_order: c.sort_order })));
    if (!ok) {
      Alert.alert('Error', 'Failed to reorder categories');
      logMutationError('category.reorder.failed', { reordered: reordered.map((c) => c.id) });
      if (pendingCategories) setCategories(pendingCategories);
    } else {
      showToast('Categories reordered');
    }
  };

  const handleUpdateCategoryName = async (id: string, name: string) => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a category name.');
      return;
    }
    if (categories.some(c => c.id !== id && c.name.toLowerCase() === name.trim().toLowerCase())) {
      Alert.alert('Duplicate', 'Category name already exists.');
      return;
    }
    setPendingCategories(categories);
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name } : c));
    const ok = await updateCategory(id, { name });
    if (!ok) {
      Alert.alert('Error', 'Failed to rename category');
      logMutationError('category.rename.failed', { id });
      if (pendingCategories) setCategories(pendingCategories);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    Alert.alert('Delete category', 'Items will lose this category. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setPendingCategories(categories);
          setCategories(prev => prev.filter(c => c.id !== id));
          const ok = await deleteCategory(id);
          if (!ok) {
            Alert.alert('Error', 'Failed to delete category');
            logMutationError('category.delete.failed', { id });
            if (pendingCategories) setCategories(pendingCategories);
          } else {
            if (selectedCategory === id) setSelectedCategory('All');
            showToast('Category deleted');
          }
        }
      }
    ]);
  };

  const getItemStats = () => {
    const total = menuItems.length;
    const available = menuItems.filter(item => item.is_available).length;
    const popular = menuItems.filter(item => item.is_popular).length;
    const unavailable = total - available;

    return { total, available, popular, unavailable };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <Header title="Menu Management" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <Header title="Menu Management" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Restaurant not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getItemStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Header 
        title="Menu Management" 
        showBackButton 
        rightComponent={<RealtimeIndicator />}
      />

      {/* Overview */}
      <Text style={styles.sectionHeading}>Overview</Text>
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.colors.status.success }]}>{stats.available}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.colors.status.warning }]}>{stats.popular}</Text>
          <Text style={styles.statLabel}>Popular</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.colors.status.error }]}>{stats.unavailable}</Text>
          <Text style={styles.statLabel}>Unavailable</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.stickyBar}>
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search menu items..."
            style={styles.searchBar}
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={theme.colors.secondaryText} />
          </TouchableOpacity>
          <Button title="Add Item" onPress={addNewItem} style={styles.addCta} />
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {derivedCategoryFilters.map((categoryValue) => (
                <TouchableOpacity
                  key={categoryValue}
                  style={[
                    styles.categoryFilter,
                    selectedCategory === categoryValue && styles.selectedCategoryFilter
                  ]}
                  onPress={() => setSelectedCategory(categoryValue)}
                >
                  <Text style={[
                    styles.categoryFilterText,
                    selectedCategory === categoryValue && styles.selectedCategoryFilterText
                  ]}>
                    {getCategoryLabel(categoryValue)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.manageCategoriesButton} onPress={() => setShowCategoryManager(true)}>
              <Text style={styles.manageCategoriesText}>Manage categories</Text>
            </TouchableOpacity>
            <View style={styles.filterToggles}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Only available</Text>
                <Switch value={onlyAvailable} onValueChange={setOnlyAvailable} />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Only popular</Text>
                <Switch value={onlyPopular} onValueChange={setOnlyPopular} />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Menu Items List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
      >
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
      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* Category Manager Modal */}
      <Modal visible={showCategoryManager} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Categories</Text>
              <TouchableOpacity onPress={() => setShowCategoryManager(false)}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Drag or use arrows to reorder. Global categories are shared; scoped belong to you.</Text>
            <ScrollView>
              {categories.map((cat, idx) => (
                <View key={cat.id} style={styles.manageRow}>
                  <GripVertical size={16} color={theme.colors.secondaryText} />
                  <TextInput
                    style={[styles.categoryInput, styles.flex1]}
                    value={renameDrafts[cat.id] ?? cat.name}
                    onChangeText={(val) => setRenameDrafts(prev => ({ ...prev, [cat.id]: val }))}
                    onBlur={() => handleUpdateCategoryName(cat.id, (renameDrafts[cat.id] ?? cat.name).trim())}
                  />
                  <Text style={styles.scopePill}>{cat.restaurant_id ? 'Your restaurant' : 'Global'}</Text>
                  <View style={styles.reorderButtons}>
                    <TouchableOpacity onPress={() => moveCategory(idx, 'up')} disabled={idx === 0}>
                      <ArrowUp size={18} color={idx === 0 ? theme.colors.border : theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveCategory(idx, 'down')} disabled={idx === categories.length - 1}>
                      <ArrowDown size={18} color={idx === categories.length - 1 ? theme.colors.border : theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)} style={styles.deleteBtn}>
                    <Trash2 size={16} color={theme.colors.status.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={styles.addCategoryRow}>
              <TextInput
                style={[styles.categoryInput, styles.flex1]}
                placeholder="New category name"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity style={styles.addCategoryButton} onPress={handleCreateCategory}>
                <Text style={styles.addCategoryButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const isCompact = theme.device.isSmallScreen;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing.sm,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    errorText: {
      ...theme.typography.body,
      color: theme.colors.status.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
    },
    retryButtonText: {
      ...theme.typography.button,
      color: '#FFFFFF',
    },
    statsBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionWrapper: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    sectionHeading: {
      ...theme.typography.title2,
      marginBottom: theme.spacing.xs,
    },
    stickyBar: {
      backgroundColor: theme.colors.surface,
      paddingBottom: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      ...theme.shadows.card,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statNumber: {
      ...theme.typography.title2,
      marginBottom: 2,
    },
    statLabel: {
      ...theme.typography.caption,
      color: theme.colors.secondaryText,
    },
    searchSection: {
      flexDirection: 'row',
      alignItems: isCompact ? 'stretch' : 'center',
      flexWrap: 'wrap',
      rowGap: theme.spacing.sm,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.sm,
    },
    addCta: { minWidth: isCompact ? '100%' : 110 },
    searchBar: {
      flex: 1,
      minWidth: isCompact ? '100%' : undefined,
      margin: 0,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    flex1: { flex: 1 },
    filtersContainer: {
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.subhead,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    categoriesManager: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.xs,
    },
    categoryInput: {
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontFamily: 'Inter-Regular',
      color: theme.colors.formText,
      backgroundColor: theme.colors.formSurface,
    },
    addCategoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    addCategoryButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    addCategoryButtonText: {
      ...theme.typography.subhead,
      color: '#FFFFFF',
      fontFamily: 'Inter-SemiBold',
    },
    categoryFilter: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginRight: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedCategoryFilter: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    categoryFilterText: {
      ...theme.typography.subhead,
      color: theme.colors.secondaryText,
    },
    selectedCategoryFilterText: {
      color: '#FFFFFF',
      fontFamily: 'Inter-SemiBold',
    },
    manageCategoriesButton: {
      marginTop: theme.spacing.xs,
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    manageCategoriesText: {
      ...theme.typography.subhead,
      color: theme.colors.text,
    },
    filterToggles: {
      gap: theme.spacing.xs,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleLabel: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    content: {
      flex: 1,
    },
    itemsList: {
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: 80,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl2,
      paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
      ...theme.typography.title2,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    emptyText: {
      ...theme.typography.body,
      color: theme.colors.secondaryText,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: theme.spacing.lg,
    },
    emptyButton: {
      marginTop: theme.spacing.sm,
    },
    toast: {
      position: 'absolute',
      bottom: theme.spacing.lg,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      backgroundColor: theme.colors.surfaceStrong,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      ...theme.shadows.card,
    },
    toastText: {
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
      fontSize: 14,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      maxHeight: '80%',
      gap: theme.spacing.sm,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      ...theme.typography.title2,
    },
    modalSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.secondaryText,
    },
    scopePill: {
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md,
      fontFamily: 'Inter-Medium',
      color: theme.colors.secondaryText,
    },
    deleteBtn: {
      padding: theme.spacing.xs,
    },
    sortNumber: {
      width: 20,
      textAlign: 'center',
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.secondaryText,
    },
    manageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    reorderButtons: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
  });
}
