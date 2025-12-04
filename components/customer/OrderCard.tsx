import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, Truck, MapPin } from 'lucide-react-native';
import Card from '../ui/Card';
import OrderStatusBadge from '../common/OrderStatusBadge';
import Button from '../ui/Button';

interface Order {
  id: string;
  restaurantName: string;
  items: string[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  orderTime: string;
  deliveryTime?: string;
  address?: string;
  estimatedDelivery?: string;
}

interface OrderCardProps {
  order: Order;
  onTrack?: () => void;
  onReorder?: () => void;
}

export default function OrderCard({ order, onTrack, onReorder }: OrderCardProps) {
  const isActive = !['delivered', 'cancelled'].includes(order.status);

  return (
    <Card style={[styles.orderCard, isActive ? styles.activeCard : undefined] as any}>
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.restaurantName}>{order.restaurantName}</Text>
          <Text style={styles.orderTime}>{order.orderTime}</Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      {/* Order Items */}
      <View style={styles.orderItems}>
        {order.items.slice(0, 3).map((item, index) => (
          <Text key={index} style={styles.orderItem}>• {item}</Text>
        ))}
        {order.items.length > 3 && (
          <Text style={styles.moreItems}>+{order.items.length - 3} more items</Text>
        )}
      </View>

      {/* Delivery Info */}
      {isActive && order.address && (
        <View style={styles.deliveryInfo}>
          <View style={styles.deliveryRow}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.deliveryText}>{order.address}</Text>
          </View>
          {order.deliveryTime && (
            <View style={styles.deliveryRow}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.deliveryText}>Estimated: {order.deliveryTime}</Text>
            </View>
          )}
          {order.estimatedDelivery && (
            <View style={styles.deliveryRow}>
              <Truck size={16} color="#FF6B35" />
              <Text style={styles.deliveryTextHighlight}>
                Expected: {order.estimatedDelivery}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Order Footer */}
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>Total: ${order.total.toFixed(2)}</Text>
        <View style={styles.orderActions}>
          {onTrack && (
            <Button title="Track Order" onPress={onTrack} size="small" />
          )}
          {onReorder && (
            <Button title="Reorder" onPress={onReorder} variant="outline" size="small" />
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  orderItems: {
    marginBottom: 12,
  },
  orderItem: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  moreItems: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  deliveryInfo: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deliveryText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
    flex: 1,
  },
  deliveryTextHighlight: {
    fontSize: 14,
    color: '#FF6B35',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderTotal: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  orderActions: {
    gap: 8,
  },
});
