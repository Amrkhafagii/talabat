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
      <View style={styles(theme).orderHeader}>
        <View style={styles(theme).thumbnail}>
          <Icon name="Store" size="lg" color={theme.colors.text} />
        </View>
        <View style={styles(theme).headerText}>
          <View style={styles(theme).titleRow}>
            <Text style={styles(theme).restaurantName}>{order.restaurantName}</Text>
            <OrderStatusBadge status={order.status} />
          </View>
          <Text style={styles(theme).orderTime}>{order.orderTime}</Text>
          {order.address && <Text style={styles(theme).addressLine}>{order.address}</Text>}
          <Text style={styles(theme).itemsLine} numberOfLines={1}>
            {order.items.slice(0, 3).join(', ')}
            {order.items.length > 3 ? ` +${order.items.length - 3} more` : ''}
          </Text>
        </View>
      </View>

      <View style={styles(theme).metaRow}>
        <View style={styles(theme).pill}>
          <Icon name="Clock" size="sm" color={theme.colors.primary[500]} />
          <Text style={styles(theme).pillText}>{order.deliveryTime || 'ETA pending'}</Text>
        </View>
        <Text style={styles(theme).orderTotal}>{formatCurrency(order.total)}</Text>
      </View>

      <View style={styles(theme).orderFooter}>
        {onTrack && (
          <Button title={isActive ? 'Track Order' : 'View'} onPress={onTrack} size="small" />
        )}
        {onReorder && (
          <Button title="Reorder" onPress={onReorder} variant="outline" size="small" />
        )}
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
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    thumbnail: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1, gap: 4 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    restaurantName: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    orderTime: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    addressLine: { fontSize: 13, color: theme.colors.textMuted, fontFamily: 'Inter-Regular' },
    itemsLine: { fontSize: 13, color: theme.colors.text, fontFamily: 'Inter-Regular' },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary[50],
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pillText: { fontFamily: 'Inter-SemiBold', color: theme.colors.primary[600], fontSize: 13 },
    orderTotal: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    orderFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 10,
    },
  });
