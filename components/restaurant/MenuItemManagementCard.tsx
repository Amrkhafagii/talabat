import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface MenuItemManagement {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isPopular: boolean;
  isAvailable: boolean;
  preparationTime: number;
  isScheduled?: boolean;
  availabilityLabel?: string;
  highlight?: boolean;
  photoStatus?: 'pending' | 'approved' | 'rejected';
  photoNote?: string | null;
}

interface MenuItemManagementCardProps {
  item: MenuItemManagement;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailability: () => void;
  onTogglePopular: () => void;
  dragHandle?: React.ReactNode;
}

export default function MenuItemManagementCard({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
  onTogglePopular,
  dragHandle,
}: MenuItemManagementCardProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.card,
        !item.isAvailable ? styles.unavailableCard : undefined,
        item.highlight ? styles.highlightCard : undefined,
      ]}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder} />
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.category} numberOfLines={1}>{item.category}</Text>
          </View>
          <View style={styles.toggleGroup}>
            <Text style={styles.toggleLabel}>Available</Text>
            <Switch
              value={item.isAvailable}
              onValueChange={onToggleAvailability}
              trackColor={{ false: theme.colors.borderMuted, true: theme.colors.accent }}
              thumbColor={theme.colors.textInverse}
            />
          </View>
          {dragHandle ?? <Icon name="GripVertical" size="sm" color={theme.colors.secondaryText} />}
        </View>

        {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}

        <View style={styles.bottomRow}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          <View style={styles.iconRow}>
            <TouchableOpacity onPress={onTogglePopular} style={[styles.iconButton, item.isPopular && styles.iconButtonActive]}>
              <Icon
                name="Star"
                size={14}
                color={item.isPopular ? theme.colors.textInverse : theme.colors.secondaryText}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
              <Icon name="Pencil" size={14} color={theme.colors.secondaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.iconButton}>
              <Icon name="Trash2" size={14} color={theme.colors.status.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      borderRadius: theme.radius.card,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      marginBottom: theme.spacing.md,
      ...theme.shadows.card,
    },
    highlightCard: { borderColor: theme.colors.accent },
    unavailableCard: { opacity: 0.75 },
    image: { width: 96, height: 96, borderTopLeftRadius: theme.radius.card, borderBottomLeftRadius: theme.radius.card },
    imagePlaceholder: { width: 96, height: 96, borderTopLeftRadius: theme.radius.card, borderBottomLeftRadius: theme.radius.card, backgroundColor: theme.colors.surfaceAlt },
    body: { flex: 1, padding: theme.spacing.md, gap: theme.spacing.sm },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    name: { ...theme.typography.subhead, flex: 1 },
    category: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 2 },
    toggleGroup: { alignItems: 'center', gap: theme.spacing.xs },
    toggleLabel: { ...theme.typography.caption, color: theme.colors.secondaryText },
    description: { ...theme.typography.caption, color: theme.colors.secondaryText },
    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    price: { ...theme.typography.subhead, color: theme.colors.text },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      backgroundColor: theme.colors.surfaceAlt,
    },
    iconButtonActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  });
}
