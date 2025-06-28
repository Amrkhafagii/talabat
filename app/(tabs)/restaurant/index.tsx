import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, DollarSign, Clock, Star, TrendingUp, Bell } from 'lucide-react-native';

import StatCard from '@/components/common/StatCard';
import OrderManagementCard from '@/components/restaurant/OrderManagementCard';
import Button from '@/components/ui/Button';
import { restaurantOrders } from '@/constants/data';

const todayStats = {
  revenue: 1247.50,
  orders: 23,
  avgOrderValue: 54.24,
  rating: 4.6,
};

export default function RestaurantDashboard() {
  const updateOrderStatus = (orderId: number, newStatus: string) => {
    console.log(`Update order ${orderId} to ${newStatus}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Store size={24} color="#FF6B35" />
          <View style={styles.headerText}>
            <Text style={styles.restaurantName}>Mario's Pizza Palace</Text>
            <Text style={styles.restaurantStatus}>Open • 8:00 AM - 10:00 PM</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Bell size={20} color="#6B7280" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationCount}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={DollarSign}
              value={`$${todayStats.revenue.toFixed(2)}`}
              label="Revenue"
              iconColor="#10B981"
            />
            <StatCard
              icon={Clock}
              value={todayStats.orders}
              label="Orders"
              iconColor="#3B82F6"
            />
            <StatCard
              icon={TrendingUp}
              value={`$${todayStats.avgOrderValue.toFixed(2)}`}
              label="Avg Order"
              iconColor="#F59E0B"
            />
            <StatCard
              icon={Star}
              value={todayStats.rating}
              label="Rating"
              iconColor="#FFB800"
            />
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.ordersContainer}>
            {restaurantOrders.map((order) => (
              <OrderManagementCard
                key={order.id}
                order={order}
                onAccept={order.status === 'new' ? () => updateOrderStatus(order.id, 'preparing') : undefined}
                onReject={order.status === 'new' ? () => updateOrderStatus(order.id, 'rejected') : undefined}
                onMarkReady={order.status === 'preparing' ? () => updateOrderStatus(order.id, 'ready') : undefined}
                onMarkDelivered={order.status === 'ready' ? () => updateOrderStatus(order.id, 'delivered') : undefined}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <Button
              title="Manage Menu"
              onPress={() => console.log('Manage Menu')}
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title="View Analytics"
              onPress={() => console.log('View Analytics')}
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title="Restaurant Settings"
              onPress={() => console.log('Restaurant Settings')}
              variant="outline"
              style={styles.actionButton}
            />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  restaurantStatus: {
    fontSize: 14,
    color: '#10B981',
    fontFamily: 'Inter-Regular',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  ordersContainer: {
    paddingHorizontal: 20,
  },
  quickActions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});