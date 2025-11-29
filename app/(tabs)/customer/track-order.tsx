import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MapPin, Clock, Phone, User, Store } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import OrderStatusBadge from '@/components/common/OrderStatusBadge';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { formatOrderTime } from '@/utils/formatters';
import { getOrderItems } from '@/utils/orderHelpers';
import { supabase } from '@/utils/supabase';
import { getDriverById } from '@/utils/database';

const orderSteps = [
  { key: 'confirmed', label: 'Order Confirmed', icon: Store },
  { key: 'preparing', label: 'Preparing Food', icon: Clock },
  { key: 'ready', label: 'Ready for Pickup', icon: MapPin },
  { key: 'picked_up', label: 'Out for Delivery', icon: User },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

export default function TrackOrder() {
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  const { orders, loading, error } = useRealtimeOrders({
    orderIds: orderId ? [orderId] : []
  });

  const order = orders[0];
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
    updatedAt?: string;
  } | null>(null);

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    return orderSteps.findIndex(step => step.key === order.status);
  };

  const fetchDriverLocation = useCallback(async (driverId: string) => {
    const driverRecord = await getDriverById(driverId);
    if (driverRecord?.current_latitude && driverRecord?.current_longitude) {
      setDriverLocation({
        latitude: driverRecord.current_latitude,
        longitude: driverRecord.current_longitude,
        updatedAt: driverRecord.last_location_update || undefined,
      });
    }
  }, []);

  useEffect(() => {
    const driverId = order?.delivery?.driver_id;
    if (!driverId) return;

    // Fetch initial location
    fetchDriverLocation(driverId);

    // Subscribe to driver location updates
    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_drivers',
          filter: `id=eq.${driverId}`,
        },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord.current_latitude && newRecord.current_longitude) {
            setDriverLocation({
              latitude: newRecord.current_latitude,
              longitude: newRecord.current_longitude,
              updatedAt: newRecord.last_location_update,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDriverLocation, order?.delivery?.driver_id]);

  const callRestaurant = () => {
    const phoneNumber = order?.restaurant?.phone;
    if (!phoneNumber) {
      Alert.alert('Call Restaurant', 'Phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Restaurant', 'Unable to start a call on this device.');
    });
  };

  const callDriver = () => {
    const phoneNumber = order?.delivery?.driver?.user?.phone;
    if (!phoneNumber) {
      Alert.alert('Call Driver', 'Phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Call Driver', 'Unable to start a call on this device.');
    });
  };

  const openDriverInMaps = () => {
    const lat = driverLocation?.latitude || order?.delivery?.driver?.current_latitude;
    const lng = driverLocation?.longitude || order?.delivery?.driver?.current_longitude;
    if (!lat || !lng) {
      Alert.alert('Live Location', 'Driver location not available yet.');
      return;
    }
    const url = `https://maps.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Live Location', 'Unable to open maps.');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Track Order" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Track Order" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const driver = order.delivery?.driver;

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Track Order" 
        showBackButton 
        rightComponent={<RealtimeIndicator />}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.orderNumber}>Order #{order.id.slice(-6).toUpperCase()}</Text>
            <OrderStatusBadge status={order.status} size="large" />
          </View>
          <Text style={styles.restaurantName}>{order.restaurant?.name}</Text>
          <Text style={styles.orderTime}>Ordered {formatOrderTime(order.created_at)}</Text>
          {order.estimated_delivery_time && (
            <Text style={styles.estimatedTime}>
              Estimated delivery: {order.estimated_delivery_time}
            </Text>
          )}
        </Card>

        {/* Order Progress */}
        <Card style={styles.progressCard}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
          <View style={styles.progressContainer}>
            {orderSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <View key={step.key} style={styles.progressStep}>
                  <View style={styles.stepIconContainer}>
                    <View style={[
                      styles.stepIcon,
                      isCompleted && styles.stepIconCompleted,
                      isCurrent && styles.stepIconCurrent
                    ]}>
                      <StepIcon 
                        size={16} 
                        color={isCompleted ? '#FFFFFF' : '#9CA3AF'} 
                      />
                    </View>
                    {index < orderSteps.length - 1 && (
                      <View style={[
                        styles.stepLine,
                        isCompleted && styles.stepLineCompleted
                      ]} />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[
                      styles.stepLabel,
                      isCompleted && styles.stepLabelCompleted
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.stepStatus}>In Progress</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Driver Information */}
        {driver && ['picked_up', 'on_the_way'].includes(order.status) && (
          <Card style={styles.driverCard}>
            <Text style={styles.sectionTitle}>Your Driver</Text>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <User size={24} color="#FF6B35" />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>
                  {driver.user?.full_name || 'Driver'}
                </Text>
                <Text style={styles.driverRating}>
                  ⭐ {driver.rating.toFixed(1)} • {driver.total_deliveries} deliveries
                </Text>
                <Text style={styles.driverVehicle}>
                  {driver.vehicle_type.charAt(0).toUpperCase() + driver.vehicle_type.slice(1)}
                  {driver.vehicle_color && ` • ${driver.vehicle_color}`}
                </Text>
              </View>
              <Button
                title="Call"
                onPress={callDriver}
                size="small"
                variant="outline"
              />
            </View>

            {/* Live location */}
            {(driverLocation || driver.current_latitude) && (
              <View style={styles.liveLocation}>
                <View style={styles.liveLocationText}>
                  <Text style={styles.liveLocationLabel}>Live location</Text>
                  <Text style={styles.liveLocationValue}>
                    {(
                      driverLocation?.latitude || driver.current_latitude
                    )?.toFixed(4)}
                    ,{' '}
                    {(
                      driverLocation?.longitude || driver.current_longitude
                    )?.toFixed(4)}
                  </Text>
                  {driverLocation?.updatedAt && (
                    <Text style={styles.liveLocationMeta}>
                      Updated {new Date(driverLocation.updatedAt).toLocaleTimeString()}
                    </Text>
                  )}
                </View>
                <Button
                  title="Open in Maps"
                  onPress={openDriverInMaps}
                  size="small"
                  variant="ghost"
                />
              </View>
            )}
          </Card>
        )}

        {/* Order Items */}
        <Card style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsList}>
            {getOrderItems(order).map((item, index) => (
              <Text key={index} style={styles.orderItem}>• {item}</Text>
            ))}
          </View>
          <View style={styles.orderTotal}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${order.total.toFixed(2)}</Text>
          </View>
        </Card>

        {/* Delivery Address */}
        <Card style={styles.addressCard}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressInfo}>
            <MapPin size={20} color="#FF6B35" />
            <Text style={styles.addressText}>{order.delivery_address}</Text>
          </View>
          {order.delivery_instructions && (
            <Text style={styles.deliveryInstructions}>
              Instructions: {order.delivery_instructions}
            </Text>
          )}
        </Card>

        {/* Contact Actions */}
        <Card style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <View style={styles.contactActions}>
            <Button
              title="Call Restaurant"
              onPress={callRestaurant}
              variant="outline"
              style={styles.contactButton}
            />
            {driver && (
              <Button
                title="Call Driver"
                onPress={callDriver}
                variant="outline"
                style={styles.contactButton}
              />
            )}
          </View>
        </Card>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  estimatedTime: {
    fontSize: 14,
    color: '#FF6B35',
    fontFamily: 'Inter-SemiBold',
    marginTop: 4,
  },
  progressCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  progressContainer: {
    paddingLeft: 8,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconCompleted: {
    backgroundColor: '#10B981',
  },
  stepIconCurrent: {
    backgroundColor: '#FF6B35',
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  stepLabelCompleted: {
    color: '#111827',
  },
  stepStatus: {
    fontSize: 12,
    color: '#FF6B35',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  driverCard: {
    marginBottom: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  liveLocation: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  liveLocationText: {
    flex: 1,
  },
  liveLocationLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  liveLocationValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  liveLocationMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  driverRating: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  driverVehicle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
  },
  itemsCard: {
    marginBottom: 16,
  },
  itemsList: {
    marginBottom: 16,
  },
  orderItem: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 4,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  addressCard: {
    marginBottom: 16,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  deliveryInstructions: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 28,
  },
  contactCard: {
    marginBottom: 32,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
  },
});
