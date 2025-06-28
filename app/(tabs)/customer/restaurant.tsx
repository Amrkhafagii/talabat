import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Clock, ShoppingCart } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import Header from '@/components/ui/Header';
import MenuItem from '@/components/customer/MenuItem';
import Button from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';
import { menuItems } from '@/constants/data';

const menuCategories = ['Popular', 'Mains', 'Sides', 'Beverages', 'Desserts'];

export default function RestaurantDetail() {
  const params = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const { cart, addToCart, removeFromCart, getCartTotal, getTotalItems } = useCart();

  const filteredItems = menuItems.filter(item => item.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={params.restaurantName as string}
        showBackButton
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantInfo}>
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' }} 
            style={styles.restaurantImage} 
          />
          <View style={styles.restaurantDetails}>
            <Text style={styles.restaurantName}>{params.restaurantName}</Text>
            <Text style={styles.restaurantCuisine}>Italian • Pizza</Text>
            <View style={styles.restaurantMeta}>
              <View style={styles.rating}>
                <Star size={16} color="#FFB800" fill="#FFB800" />
                <Text style={styles.ratingText}>4.5</Text>
              </View>
              <View style={styles.delivery}>
                <Clock size={16} color="#6B7280" />
                <Text style={styles.deliveryText}>25-30 min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {menuCategories.map((category) => (
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
          {filteredItems.map((item) => (
            <MenuItem
              key={item.id}
              item={item}
              quantity={cart[item.id] || 0}
              onAdd={() => addToCart(item.id)}
              onRemove={() => removeFromCart(item.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Cart Button */}
      {getTotalItems() > 0 && (
        <View style={styles.cartButtonContainer}>
          <TouchableOpacity 
            style={styles.cartButton}
            onPress={() => router.push('/customer/cart')}
          >
            <View style={styles.cartInfo}>
              <ShoppingCart size={20} color="#FFFFFF" />
              <Text style={styles.cartCount}>{getTotalItems()}</Text>
            </View>
            <Text style={styles.cartText}>View Cart</Text>
            <Text style={styles.cartTotal}>${getCartTotal(menuItems).toFixed(2)}</Text>
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
});