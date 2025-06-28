import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface RestaurantOrder {
  id: number;
  orderNumber: string;
  customer: string;
  items: string[];
  total: number;
  status: 'new' | 'preparing' | 'ready';
  time: string;
}

interface OrderManagementCardProps {
  order: RestaurantOrder;
  onAccept?: () => void;
  onReject?: () => void;
  onMarkReady?: () => void;
  onMarkDelivered?: () => void;
}

const statusConfig = {
  new: { label: 'New', variant: 'primary' as const },
  preparing: { label: 'Preparing', variant: 'warning' as const },
  ready: { label: 'Ready', variant: 'success' as const },
};

export default function OrderManagementCard({
  order,
  onAccept,
  onReject,
  onMarkReady,
  onMarkDelivered,
}: OrderManagementCardProps) {
  const statusInfo = statusConfig[order.status];

  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.customerName}>{order.customer}</Text>
          <Text style={styles.orderTime}>{order.time}</Text>
        </View>
        <Badge text={statusInfo.label} variant={statusInfo.variant} />
      </View>

      <View style={styles.orderItems}>
        {order.items.map((item, index) => (
          <Text key={index} style={styles.orderItem}>• {item}</Text>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
        <View style={styles.orderActions}>
          {order.status === 'new' && (
            <>
              {onReject && (
                <Button title="Reject" onPress={onReject} variant="danger" size="small" />
              )}
              {onAccept && (
                <Button title="Accept" onPress={onAccept} variant="secondary" size="small" />
              )}
            </>
          )}
          {order.status === 'preparing' && onMarkReady && (
            <Button title="Mark Ready" onPress={onMarkReady} size="small" />
          )}
          {order.status === 'ready' && onMarkDelivered && (
            <Button title="Delivered" onPress={onMarkDelivered} variant="secondary" size="small" />
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 12,
    color: '#9CA3AF',
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
    flexDirection: 'row',
    gap: 8,
  },
});