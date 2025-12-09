import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { formatCurrency } from '@/utils/formatters';

type OrderItem = { id: string; name?: string | null; quantity: number };

type Props = {
  orderNumber: string;
  restaurantName?: string | null;
  earnings?: number | null;
  distanceKm?: number | null;
  items: OrderItem[];
  onToggle: () => void;
  expanded: boolean;
  showCall?: boolean;
  onCall?: () => void;
};

export function NavigationOrderSummary({
  orderNumber,
  restaurantName,
  earnings,
  distanceKm,
  items,
  onToggle,
  expanded,
  showCall,
  onCall,
}: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Summary</Text>
        <TouchableOpacity onPress={onToggle}>
          <Text style={styles.toggleText}>{expanded ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <>
          <View style={styles.info}>
            <Row label='Order #' value={orderNumber} />
            <Row label='Restaurant' value={restaurantName || 'Unknown Restaurant'} />
            <Row label='Earnings' value={formatCurrency(earnings ?? 0)} />
            <Row label='Distance' value={typeof distanceKm === 'number' ? `${distanceKm} km` : '—'} />
          </View>

          {items.length > 0 && (
            <View style={styles.list}>
              {items.slice(0, 4).map(item => (
                <View key={item.id} style={styles.listRow}>
                  <Text style={styles.itemName}>{item.name || 'Item'}</Text>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                </View>
              ))}
              {items.length > 4 && <Text style={styles.more}>+{items.length - 4} more</Text>}
            </View>
          )}
        </>
      )}

      {showCall && onCall && (
        <TouchableOpacity style={styles.callButton} onPress={onCall}>
          <Icon name='Phone' size='md' color={theme.colors.accent} />
          <Text style={styles.callText}>Call Customer</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => {
  const theme = useRestaurantTheme();
  return (
    <View style={rowStyles(theme).row}>
      <Text style={rowStyles(theme).label}>{label}</Text>
      <Text style={rowStyles(theme).value}>{value}</Text>
    </View>
  );
};

const rowStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    value: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontWeight: '600',
    },
  });

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.titleM,
      color: theme.colors.text,
    },
    toggleText: { ...theme.typography.caption, color: theme.colors.accent },
    info: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    list: { gap: theme.spacing.xs },
    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemName: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    itemQty: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    more: { ...theme.typography.caption, color: theme.colors.textMuted },
    callButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.md,
      gap: theme.spacing.xs,
    },
    callText: {
      ...theme.typography.button,
      color: theme.colors.accent,
    },
  });
