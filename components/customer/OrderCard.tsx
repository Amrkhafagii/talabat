import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import OrderStatusBadge from '../common/OrderStatusBadge';
import Button from '../ui/Button';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency } from '@/utils/formatters';

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
  const theme = useRestaurantTheme();

  return (
    <Card style={[styles(theme).orderCard, isActive ? styles(theme).activeCard : undefined] as any}>
      {/* Order Header */}
      <View style={styles(theme).orderHeader}>
        <View>
          <Text style={styles(theme).restaurantName}>{order.restaurantName}</Text>
          <Text style={styles(theme).orderTime}>{order.orderTime}</Text>
        </View>
        <OrderStatusBadge status={order.status} />
      </View>

      {/* Order Items */}
      <View style={styles(theme).orderItems}>
        {order.items.slice(0, 3).map((item, index) => (
          <Text key={index} style={styles(theme).orderItem}>• {item}</Text>
        ))}
        {order.items.length > 3 && (
          <Text style={styles(theme).moreItems}>+{order.items.length - 3} more items</Text>
        )}
      </View>

      {/* Delivery Info */}
      {isActive && order.address && (
        <View style={styles(theme).deliveryInfo}>
          <View style={styles(theme).deliveryRow}>
            <Icon name="MapPin" size="sm" color={theme.colors.textMuted} />
            <Text style={styles(theme).deliveryText}>{order.address}</Text>
          </View>
          {order.deliveryTime && (
            <View style={styles(theme).deliveryRow}>
              <Icon name="Clock" size="sm" color={theme.colors.textMuted} />
              <Text style={styles(theme).deliveryText}>Estimated: {order.deliveryTime}</Text>
            </View>
          )}
          {order.estimatedDelivery && (
            <View style={styles(theme).deliveryRow}>
              <Icon name="Truck" size="sm" color={theme.colors.primary[500]} />
              <Text style={styles(theme).deliveryTextHighlight}>
                Expected: {order.estimatedDelivery}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Order Footer */}
      <View style={styles(theme).orderFooter}>
        <Text style={styles(theme).orderTotal}>Total: {formatCurrency(order.total)}</Text>
        <View style={styles(theme).orderActions}>
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

const styles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    orderCard: {
      marginHorizontal: 20,
      marginBottom: 16,
    },
    activeCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary[500],
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
      color: theme.colors.text,
      marginBottom: 4,
    },
    orderTime: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    orderItems: {
      marginBottom: 12,
    },
    orderItem: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'Inter-Regular',
      lineHeight: 20,
    },
    moreItems: {
      fontSize: 14,
      color: theme.colors.textSubtle,
      fontFamily: 'Inter-Regular',
      fontStyle: 'italic',
    },
    deliveryInfo: {
      marginBottom: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    deliveryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    deliveryText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginLeft: 8,
      flex: 1,
    },
    deliveryTextHighlight: {
      fontSize: 14,
      color: theme.colors.primary[500],
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
      borderTopColor: theme.colors.border,
    },
    orderTotal: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    orderActions: {
      gap: 8,
    },
  });
