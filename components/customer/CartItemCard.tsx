import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import { useAppTheme } from '@/styles/appTheme';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, change: number) => void;
}

export default function CartItemCard({ item, onUpdateQuantity }: CartItemCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item.id, -1)}
        >
          <Minus size={16} color={theme.colors.primary[500]} />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item.id, 1)}
        >
          <Plus size={16} color={theme.colors.primary[500]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    cartItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    itemPrice: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 8,
      paddingHorizontal: 4,
    },
    quantityButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quantityText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      minWidth: 30,
      textAlign: 'center',
    },
  });
