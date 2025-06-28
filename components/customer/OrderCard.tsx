import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, CircleCheck as CheckCircle, Truck, MapPin } from 'lucide-react-native';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface Order {
  id: number;
  restaurantName: string;
  items: string[];
  total: number;
  status: 'preparing' | 'on_the_way' | 'delivered';
  orderTime: string;
  deliveryTime?: string;
  address?: string;
}

interface OrderCardProps {
  order: Order;
  onTrack?: () => void;
  onReorder?: () => void;
}

const statusConfig = {
  preparing: {
    label: 'Preparing',
    variant: 'warning' as const,
    icon: Clock,
  },
  on_the_way: {
    label: 'On the way',
    variant: 'primary' as const,
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    variant: 'success' as const,
    icon: CheckCircle,
  },
};

export default function OrderCard({ order, onTrack, onReorder }: OrderCardProps) {
  const StatusIcon = statusConfig[order.status].icon;
  const statusInfo = statusConfig[order.status];

  return (
    <Card style={styles.orderCard}>
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.restaurantName}>{order.restaurantName}</Text>
          <Text style={styles.orderTime}>{order.orderTime}</Text>
        </View>
        <Badge text={statusInfo.label} variant={statusInfo.variant} />
      </View>

      {/* Order Items */}
      <View style={styles.orderItems}>
        {order.items.map((item, index) => (
          <Text key={index} style={styles.orderItem}>• {item}</Text>
        ))}
      </View>

      {/* Delivery Info */}
      {order.status !== 'delivered' && order.address && order.deliveryTime && (
        <View style={styles.deliveryInfo}>
          <View style={styles.deliveryRow}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.deliveryText}>{order.address}</Text>
          </View>
          <View style={styles.deliveryRow}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.deliveryText}>Estimated: {order.deliveryTime}</Text>
          </View>
        </View>
      )}

      {/* Order Footer */}
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>Total: ${order.total.toFixed(2)}</Text>
        <View style={styles.orderActions}>
          {order.status !== 'delivered' && onTrack ? (
            <Button title="Track Order" onPress={onTrack} size="small" />
          ) : onReorder ? (
            <Button title="Reorder" onPress={onReorder} variant="outline" size="small" />
          ) : null}
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