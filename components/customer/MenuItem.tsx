import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import Badge from '../ui/Badge';

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
  const handleAdd = () => {
    if (disabled) return;
    onAdd();
  };

  return (
    <View style={styles.menuItem}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.popular && <Badge text="POPULAR" variant="primary" size="small" />}
        </View>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
      </View>
      <View style={styles.itemImageContainer}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        {quantity > 0 ? (
          <View style={styles.quantityControls}>
            <TouchableOpacity style={styles.quantityButton} onPress={onRemove}>
              <Minus size={16} color="#FF6B35" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, disabled && styles.disabledButton]}
              onPress={handleAdd}
              disabled={disabled}
            >
              <Plus size={16} color={disabled ? '#D1D5DB' : '#FF6B35'} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, disabled && styles.disabledAddButton]}
            onPress={handleAdd}
            disabled={disabled}
          >
            <Plus size={20} color={disabled ? '#9CA3AF' : '#FFFFFF'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    lineHeight: 20,
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#111827',
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
    bottom: 4, // Changed from -8 to 4
    right: 4,  // Changed from -8 to 4
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quantityControls: {
    position: 'absolute',
    bottom: 4, // Changed from -8 to 4
    right: 4,  // Changed from -8 to 4
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    color: '#FF6B35',
    minWidth: 20,
    textAlign: 'center',
  },
  disabledAddButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
