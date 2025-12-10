import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import Badge from '../ui/Badge';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { formatCurrency } from '@/utils/formatters';

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  popular?: boolean;
  available?: boolean;
}

interface MenuItemProps {
  item: MenuItemData;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
  unavailableReason?: string;
}

export default function MenuItem({ item, quantity, onAdd, onRemove, disabled = false, unavailableReason }: MenuItemProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isSoldOut = (!!unavailableReason) || item.available === false;

  const handleAdd = () => {
    if (disabled || isSoldOut) return;
    onAdd();
  };

  return (
    <View style={[styles.menuItem, isSoldOut && styles.soldOutCard]}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badgeRow}>
            {item.popular && <Badge label="POPULAR" tone="info" />}
            {isSoldOut && <Badge label={unavailableReason || 'SOLD OUT'} tone="warning" />}
          </View>
        </View>
        <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
          {isSoldOut && <Text style={styles.soldOutText}>Unavailable</Text>}
        </View>
      </View>
      <View style={styles.itemImageContainer}>
        <Image source={{ uri: item.image }} style={[styles.itemImage, isSoldOut && styles.itemImageDim]} />
        {(quantity > 0 && !isSoldOut) ? (
          <View style={styles.quantityControls}>
            <TouchableOpacity style={styles.quantityButton} onPress={onRemove}>
              <Icon name="Minus" size="sm" color={theme.colors.primary[500]} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, (disabled || isSoldOut) && styles.disabledButton]}
              onPress={handleAdd}
              disabled={disabled || isSoldOut}
            >
              <Icon name="Plus" size="sm" color={disabled || isSoldOut ? theme.colors.textSubtle : theme.colors.primary[500]} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, (disabled || isSoldOut) && styles.disabledAddButton]}
            onPress={handleAdd}
            disabled={disabled || isSoldOut}
          >
            <Icon name="Plus" size="md" color={disabled || isSoldOut ? theme.colors.textSubtle : theme.colors.textInverse} />
          </TouchableOpacity>
        )}
        {isSoldOut && <View style={styles.soldOverlay}><Text style={styles.soldOverlayText}>Sold Out</Text></View>}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    soldOutCard: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    itemInfo: {
      flex: 1,
      marginRight: 12,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    itemName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      flex: 1,
      marginRight: 8,
    },
    badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    itemDescription: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginBottom: 10,
      lineHeight: 20,
    },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemPrice: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    soldOutText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Medium',
    },
    itemImageContainer: {
      position: 'relative',
      overflow: 'visible',
    },
    itemImage: {
      width: 86,
      height: 86,
      borderRadius: 12,
    },
    addButton: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary[500],
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.card,
    },
    quantityControls: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.colors.primary[500],
      ...theme.shadows.card,
    },
    quantityButton: {
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quantityText: {
      fontSize: 14,
      fontFamily: 'Inter-Bold',
      color: theme.colors.primary[500],
      minWidth: 20,
      textAlign: 'center',
    },
    disabledAddButton: {
      backgroundColor: theme.colors.borderMuted,
    },
    disabledButton: {
      opacity: 0.5,
    },
    soldOverlay: {
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    soldOverlayText: {
      color: theme.colors.textInverse,
      fontFamily: 'Inter-SemiBold',
      fontSize: 12,
    },
    itemImageDim: { opacity: 0.5 },
  });
