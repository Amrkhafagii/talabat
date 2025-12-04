import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, Filter } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import SearchBar from '@/components/ui/SearchBar';
import MenuItemManagementCard from '@/components/restaurant/MenuItemManagementCard';
import Button from '@/components/ui/Button';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getRestaurantByUserId, 
  getMenuItemsByRestaurant, 
  getCategories,
  updateMenuItem,
  deleteMenuItem
} from '@/utils/database';
import { Restaurant, MenuItem, Category } from '@/types/database';

const categoryFilters = ['All', 'Popular', 'Mains', 'Sides', 'Beverages', 'Desserts'];

export default function MenuManagement() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    filterMenuItems();
  }, [menuItems, searchQuery, selectedCategory]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [restaurantData, categoriesData] = await Promise.all([
        getRestaurantByUserId(user.id),
        getCategories()
      ]);

      if (!restaurantData) {
        setError('No restaurant found for this user');
        return;
      }

      setRestaurant(restaurantData);
      setCategories(categoriesData);

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
        filtered = filtered.filter(item => item.category === selectedCategory);
      }
    }

    setFilteredItems(filtered);
  };

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      const success = await updateMenuItem(itemId, { is_available: !isAvailable });
      
      if (success) {
        setMenuItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, is_available: !isAvailable }
              : item
          )
        );
      } else {
        Alert.alert('Error', 'Failed to update item availability');
      }
    } catch (err) {
      console.error('Error updating availability:', err);
      Alert.alert('Error', 'Failed to update item availability');
    }
  };

  const handleTogglePopular = async (itemId: string, isPopular: boolean) => {
    try {
      const success = await updateMenuItem(itemId, { is_popular: !isPopular });
      
      if (success) {
        setMenuItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, is_popular: !isPopular }
              : item
          )
        );
      } else {
        Alert.alert('Error', 'Failed to update popular status');
      }
    } catch (err) {
      console.error('Error updating popular status:', err);
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
              const success = await deleteMenuItem(item.id);
              
              if (success) {
                setMenuItems(prev => prev.filter(i => i.id !== item.id));
                Alert.alert('Success', 'Menu item deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete menu item');
              }
            } catch (err) {
              console.error('Error deleting item:', err);
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

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
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

      {/* Search and Filters */}
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
        <TouchableOpacity style={styles.addButton} onPress={addNewItem}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categoryFilters.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryFilter,
                  selectedCategory === category && styles.selectedCategoryFilter
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryFilterText,
                  selectedCategory === category && styles.selectedCategoryFilterText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
                  category: item.category,
                  isPopular: item.is_popular,
                  isAvailable: item.is_available,
                  preparationTime: item.preparation_time
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
          </View>
        )}
      </ScrollView>
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
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  content: {
    flex: 1,
  },
  itemsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
});