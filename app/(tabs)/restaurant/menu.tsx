import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, TextInput, Animated, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Plus, Filter, ArrowUp, ArrowDown, Trash2, X } from 'lucide-react-native';

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

const baseCategoryFilters = ['All', 'Popular'];

export default function MenuManagement() {
  const { user } = useAuth();
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

    try {
      const { success, error, errorCode } = await updateMenuItem(itemId, { is_available: !isAvailable }, restaurant.id);

      if (success) {
        setMenuItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, is_available: !isAvailable }
              : item
          )
        );
        showToast(!isAvailable ? 'Item marked available' : 'Item marked unavailable');
      } else {
        const friendly = errorCode === '42501'
          ? 'You cannot update items you do not own.'
          : 'Failed to update item availability';
        logMutationError('menu.updateAvailability.failed', { itemId, error, errorCode });
        Alert.alert('Error', friendly);
      }
    } catch (err) {
      console.error('Error updating availability:', err);
      logMutationError('menu.updateAvailability.failed', { itemId, err: String(err) });
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

    try {
      const { success, error, errorCode } = await updateMenuItem(itemId, { is_popular: !isPopular }, restaurant.id);

      if (success) {
        setMenuItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, is_popular: !isPopular }
              : item
          )
        );
        showToast(!isPopular ? 'Item marked popular' : 'Item unmarked popular');
      } else {
        const friendly = errorCode === '42501'
          ? 'You cannot update items you do not own.'
          : 'Failed to update popular status';
        logMutationError('menu.updatePopular.failed', { itemId, error, errorCode });
        Alert.alert('Error', friendly);
      }
    } catch (err) {
      console.error('Error updating popular status:', err);
      logMutationError('menu.updatePopular.failed', { itemId, err: String(err) });
      Alert.alert('Error', 'Failed to update popular status');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    router.push({
      pathname: '/restaurant/edit-menu-item',
      params: { itemId: item.id }
    });
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
    router.push('/restaurant/add-menu-item');
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
        <Header title="Menu Management" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
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
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.available}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#FFB800' }]}>{stats.popular}</Text>
          <Text style={styles.statLabel}>Popular</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.unavailable}</Text>
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
            <Filter size={20} color="#6B7280" />
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

      {/* Category Manager */}
      <View style={styles.categoriesManager}>
        <Text style={styles.sectionTitle}>Manage Categories</Text>
        <View style={styles.addCategoryRow}>
          <TextInput
            style={[styles.categoryInput, styles.flex1]}
            placeholder="New category"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
          <TouchableOpacity style={styles.addCategoryButton} onPress={handleCreateCategory}>
            <Text style={styles.addCategoryButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {categories.map((cat, idx) => (
          <View key={cat.id} style={styles.manageRow}>
            <TextInput
              style={[styles.categoryInput, styles.flex1]}
              value={cat.name}
              onChangeText={(val) => handleUpdateCategoryName(cat.id, val)}
            />
            <View style={styles.reorderButtons}>
              <TouchableOpacity onPress={() => moveCategory(idx, 'up')} disabled={idx === 0}>
                <ArrowUp size={18} color={idx === 0 ? '#D1D5DB' : '#111827'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveCategory(idx, 'down')} disabled={idx === categories.length - 1}>
                <ArrowDown size={18} color={idx === categories.length - 1 ? '#D1D5DB' : '#111827'} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Global categories are shared; scoped ones belong to your restaurant.</Text>
            <ScrollView>
              {categories.map((cat, idx) => (
                <View key={cat.id} style={styles.manageRow}>
                  <Text style={styles.sortNumber}>{idx + 1}</Text>
                  <TextInput
                    style={[styles.categoryInput, styles.flex1]}
                    value={renameDrafts[cat.id] ?? cat.name}
                    onChangeText={(val) => setRenameDrafts(prev => ({ ...prev, [cat.id]: val }))}
                    onBlur={() => handleUpdateCategoryName(cat.id, (renameDrafts[cat.id] ?? cat.name).trim())}
                  />
                  <Text style={styles.scopePill}>{cat.restaurant_id ? 'Your restaurant' : 'Global'}</Text>
                  <View style={styles.reorderButtons}>
                    <TouchableOpacity onPress={() => moveCategory(idx, 'up')} disabled={idx === 0}>
                      <ArrowUp size={18} color={idx === 0 ? '#D1D5DB' : '#111827'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveCategory(idx, 'down')} disabled={idx === categories.length - 1}>
                      <ArrowDown size={18} color={idx === categories.length - 1 ? '#D1D5DB' : '#111827'} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat.id)} style={styles.deleteBtn}>
                    <Trash2 size={16} color="#EF4444" />
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  stickyBar: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  addCta: { minWidth: 110 },
  searchBar: {
    flex: 1,
    margin: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: { flex: 1 },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  categoriesManager: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  addCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addCategoryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addCategoryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  selectedCategoryFilter: {
    backgroundColor: '#FF6B35',
  },
  categoryFilterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  selectedCategoryFilterText: {
    color: '#FFFFFF',
  },
  manageCategoriesButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  manageCategoriesText: {
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  filterToggles: {
    marginTop: 10,
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  content: {
    flex: 1,
  },
  itemsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 16,
  },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#111827',
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  scopePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  deleteBtn: {
    padding: 6,
  },
  sortNumber: {
    width: 20,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 6,
  },
});
