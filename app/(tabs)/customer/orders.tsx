import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Header from '@/components/ui/Header';
import OrderCard from '@/components/customer/OrderCard';
import Button from '@/components/ui/Button';
import { orders } from '@/constants/data';

export default function Orders() {
  const [selectedTab, setSelectedTab] = useState('active');

  const activeOrders = orders.filter(order => order.status !== 'delivered');
  const pastOrders = orders.filter(order => order.status === 'delivered');
  const displayOrders = selectedTab === 'active' ? activeOrders : pastOrders;

  const trackOrder = (orderId: number) => {
    console.log('Track order:', orderId);
  };

  const reorder = (orderId: number) => {
    console.log('Reorder:', orderId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Orders" showBackButton />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
          onPress={() => setSelectedTab('active')}
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.activeTabText]}>
            Active ({activeOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
          onPress={() => setSelectedTab('past')}
        >
          <Text style={[styles.tabText, selectedTab === 'past' && styles.activeTabText]}>
            Past ({pastOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {displayOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onTrack={order.status !== 'delivered' ? () => trackOrder(order.id) : undefined}
            onReorder={order.status === 'delivered' ? () => reorder(order.id) : undefined}
          />
        ))}

        {displayOrders.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>
              {selectedTab === 'active' 
                ? 'You don\'t have any active orders'
                : 'You haven\'t placed any orders yet'
              }
            </Text>
            <Button
              title="Explore Restaurants"
              onPress={() => router.push('/customer/')}
              style={styles.exploreButton}
            />
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FF6B35',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  exploreButton: {
    marginTop: 16,
  },
});