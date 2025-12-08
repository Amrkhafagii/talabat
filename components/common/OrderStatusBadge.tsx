import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, CircleCheck as CheckCircle, Truck, Package, Circle as XCircle } from 'lucide-react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { getOrderStatusToken } from '@/styles/statusTokens';

interface OrderStatusBadgeProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle,
  preparing: Package,
  ready: CheckCircle,
  picked_up: Truck,
  on_the_way: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

export default function OrderStatusBadge({ 
  status, 
  size = 'medium', 
  showIcon = true 
}: OrderStatusBadgeProps) {
  const theme = useRestaurantTheme();
  const token = useMemo(() => getOrderStatusToken(status, theme), [status, theme]);
  const IconComponent = statusIcons[status] || Clock;

  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
      iconSize: 12,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12,
      iconSize: 14,
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
      iconSize: 16,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[
        styles.badge,
        {
          backgroundColor: token.background,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        }
      ]}>
      {showIcon && (
        <IconComponent 
          size={currentSize.iconSize} 
          color={token.color} 
          style={styles.icon}
        />
      )}
      <Text style={[
        styles.text,
        {
          color: token.color,
          fontSize: currentSize.fontSize,
        }
      ]}>
        {token.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
  },
});
