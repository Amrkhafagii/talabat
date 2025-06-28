import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, DollarSign, Clock, CircleCheck as CheckCircle } from 'lucide-react-native';

import StatCard from '@/components/common/StatCard';
import DeliveryCard from '@/components/delivery/DeliveryCard';
import Button from '@/components/ui/Button';
import { deliveryOrders, activeDelivery } from '@/constants/data';

const driverStats = {
  todayEarnings: 147.50,
  completedDeliveries: 8,
  avgDeliveryTime: 22,
  rating: 4.9,
};

export default function DeliveryDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasActiveDelivery, setHasActiveDelivery] = useState(true);

  const acceptOrder = (orderId: number) => {
    console.log('Accept order:', orderId);
    setHasActiveDelivery(true);
  };

  const completeDelivery = () => {
    console.log('Complete delivery');
    setHasActiveDelivery(false);
  };

  const callCustomer = (phone: string) => {
    console.log('Call customer:', phone);
  };

  const navigate = (address: string) => {
    console.log('Navigate to:', address);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Truck size={24} color="#FF6B35" />
          <View style={styles.headerText}>
            <Text style={styles.driverName}>John Driver</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.statusText, { color: isOnline ? '#10B981' : '#EF4444' }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
        <Button
          title={isOnline ? 'Go Offline' : 'Go Online'}
          onPress={() => setIsOnline(!isOnline)}
          variant={isOnline ? 'danger' : 'secondary'}
          size="small"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={DollarSign}
              value={`$${driverStats.todayEarnings.toFixed(2)}`}
              label="Earnings"
              iconColor="#10B981"
            />
            <StatCard
              icon={CheckCircle}
              value={driverStats.completedDeliveries}
              label="Deliveries"
              iconColor="#3B82F6"
            />
            <StatCard
              icon={Clock}
              value={`${driverStats.avgDeliveryTime}m`}
              label="Avg Time"
              iconColor="#F59E0B"
            />
            <StatCard
              icon={Truck}
              value={driverStats.rating}
              label="Rating"
              iconColor="#FFB800"
            />
          </View>
        </View>

        {/* Active Delivery */}
        {hasActiveDelivery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Delivery</Text>
            <View style={styles.deliveryContainer}>
              <DeliveryCard
                order={activeDelivery}
                onCall={() => callCustomer(activeDelivery.customerPhone)}
                onNavigate={() => navigate(activeDelivery.deliveryAddress)}
                onComplete={completeDelivery}
              />
            </View>
          </View>
        )}

        {/* Available Orders */}
        {!hasActiveDelivery && isOnline && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Orders</Text>
            <View style={styles.ordersContainer}>
              {deliveryOrders.map((order) => (
                <DeliveryCard
                  key={order.id}
                  order={order}
                  onAccept={() => acceptOrder(order.id)}
                />
              ))}
            </View>

            {deliveryOrders.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No orders available</Text>
                <Text style={styles.emptyText}>New delivery requests will appear here</Text>
              </View>
            )}
          </View>
        )}

        {/* Offline State */}
        {!isOnline && (
          <View style={styles.offlineState}>
            <Truck size={48} color="#9CA3AF" />
            <Text style={styles.offlineTitle}>You're offline</Text>
            <Text style={styles.offlineText}>Go online to start receiving delivery requests</Text>
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
  driverName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  deliveryContainer: {
    paddingHorizontal: 20,
  },
  ordersContainer: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  offlineState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  offlineTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});