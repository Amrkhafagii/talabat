import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency } from '@/utils/formatters';

interface DeliveryOrder {
  id: string;
  restaurantName: string;
  customerName: string;
  customerPhone?: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: string;
  estimatedTime: string;
  payment: number;
  items: string[];
  status?: 'available' | 'active';
}

interface DeliveryCardProps {
  order: DeliveryOrder;
  onAccept?: () => void;
  onCall?: () => void;
  onNavigate?: () => void;
  onPickup?: () => void;
  onComplete?: () => void;
}

export default function DeliveryCard({
  order,
  onAccept,
  onCall,
  onNavigate,
  onPickup,
  onComplete,
}: DeliveryCardProps) {
  const isActive = order.status === 'active';
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={[styles.card, isActive ? styles.activeCard : undefined] as any}>
      <View style={styles.header}>
        <View>
          <Text style={styles.restaurantName}>{order.restaurantName}</Text>
          <Text style={styles.customerName}>To: {order.customerName}</Text>
        </View>
        <View style={styles.payment}>
          <Text style={styles.paymentAmount}>{formatCurrency(order.payment)}</Text>
          <Text style={styles.paymentLabel}>Payment</Text>
        </View>
      </View>

      {/* Order Items */}
      {order.items.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>Items:</Text>
          {order.items.slice(0, 2).map((item, index) => (
            <Text key={index} style={styles.itemText}>• {item}</Text>
          ))}
          {order.items.length > 2 && (
            <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
          )}
        </View>
      )}

      <View style={styles.addressInfo}>
        <View style={styles.addressContainer}>
          <Icon name="MapPin" size="sm" color={theme.colors.textMuted} />
          <View style={styles.addressDetails}>
            {isActive && <Text style={styles.addressLabel}>Pickup</Text>}
            <Text style={styles.addressText}>{order.pickupAddress}</Text>
          </View>
        </View>
        <View style={styles.addressContainer}>
          <Icon name="MapPin" size="sm" color={theme.colors.primary[500]} />
          <View style={styles.addressDetails}>
            {isActive && <Text style={styles.addressLabel}>Delivery</Text>}
            <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          </View>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.distance}>{order.distance}</Text>
        <Text style={styles.time}>Est. {order.estimatedTime}</Text>
      </View>

      {isActive ? (
        <View style={styles.activeActions}>
          {onCall && (
            <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={onCall}>
              <Icon name="Phone" size="md" color={theme.colors.textInverse} />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {onNavigate && (
            <TouchableOpacity style={[styles.actionButton, styles.navigateButton]} onPress={onNavigate}>
              <Icon name="Navigation" size="md" color={theme.colors.textInverse} />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
          )}
          {onPickup && (
            <TouchableOpacity style={[styles.actionButton, styles.pickupButton]} onPress={onPickup}>
              <Icon name="Package" size="md" color={theme.colors.textInverse} />
              <Text style={styles.pickupButtonText}>Picked Up</Text>
            </TouchableOpacity>
          )}
          {onComplete && (
            <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={onComplete}>
              <Icon name="CheckCircle" size="md" color={theme.colors.textInverse} />
              <Text style={styles.completeButtonText}>Delivered to Customer</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        onAccept && <Button title="Accept Delivery" onPress={onAccept} />
      )}
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
    },
    activeCard: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary[500],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    restaurantName: {
      ...theme.typography.subhead,
      marginBottom: 4,
    },
    customerName: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    payment: {
      alignItems: 'flex-end',
    },
    paymentAmount: {
      ...theme.typography.title2,
      color: theme.colors.status.success,
    },
    paymentLabel: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    itemsSection: {
      marginBottom: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
      gap: theme.spacing.xs,
    },
    itemsTitle: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    itemText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    moreItems: {
      ...theme.typography.caption,
      color: theme.colors.textSubtle,
      fontStyle: 'italic',
    },
    addressInfo: {
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    addressContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    addressDetails: {
      flex: 1,
      gap: 2,
    },
    addressLabel: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    addressText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    distance: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    time: {
      ...theme.typography.caption,
      color: theme.colors.text,
    },
    activeActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      gap: theme.spacing.xs,
    },
    callButton: {
      backgroundColor: theme.colors.status.info,
    },
    navigateButton: {
      backgroundColor: theme.colors.status.success,
    },
    pickupButton: {
      backgroundColor: theme.colors.status.warning,
    },
    completeButton: {
      backgroundColor: theme.colors.primary[500],
    },
    callButtonText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.textInverse,
    },
    navigateButtonText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.textInverse,
    },
    pickupButtonText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.textInverse,
    },
    completeButtonText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.textInverse,
    },
  });
