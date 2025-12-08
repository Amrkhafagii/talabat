import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import Badge from '../ui/Badge';
import { useAppTheme } from '@/styles/appTheme';

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  popular?: boolean;
}

interface MenuItemProps {
  item: MenuItemData;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export default function MenuItem({ item, quantity, onAdd, onRemove, disabled = false }: MenuItemProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleAdd = () => {
    if (disabled) return;
    onAdd();
  };

  return (
    <View style={styles.menuItem}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.popular && <Badge label="POPULAR" tone="info" />}
        </View>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
      </View>
      <View style={styles.itemImageContainer}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        {quantity > 0 ? (
          <View style={styles.quantityControls}>
            <TouchableOpacity style={styles.quantityButton} onPress={onRemove}>
              <Minus size={16} color={theme.colors.primary[500]} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, disabled && styles.disabledButton]}
              onPress={handleAdd}
              disabled={disabled}
            >
              <Plus size={16} color={disabled ? theme.colors.textSubtle : theme.colors.primary[500]} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, disabled && styles.disabledAddButton]}
            onPress={handleAdd}
            disabled={disabled}
          >
            <Plus size={20} color={disabled ? theme.colors.textSubtle : theme.colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    menuItem: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    itemInfo: {
      flex: 1,
      marginRight: 16,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    itemName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      flex: 1,
      marginRight: 8,
    },
    itemDescription: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginBottom: 8,
      lineHeight: 20,
    },
    itemPrice: {
      fontSize: 16,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
    },
    itemImageContainer: {
      position: 'relative',
      overflow: 'visible', // Ensure buttons are visible
    },
    itemImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    addButton: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary[500],
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.card,
    },
    quantityControls: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.primary[500],
      ...theme.shadows.card,
    },
    quantityButton: {
      width: 28,
      height: 28,
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
  });
