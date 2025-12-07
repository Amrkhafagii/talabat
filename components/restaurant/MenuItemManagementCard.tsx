import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Pencil, Trash2, Star, Clock, GripVertical } from 'lucide-react-native';
import { deriveAvailabilityBadge } from '@/utils/menuOrdering';
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
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          </View>
          {dragHandle ?? <GripVertical size={18} color={theme.colors.secondaryText} />}
        </View>

        <View style={styles.badges}>
          {item.isPopular && (
            <View style={styles.popularBadge}>
              <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
          <StatusPill
            isAvailable={item.isAvailable}
            isScheduled={item.isScheduled}
            availabilityLabel={item.availabilityLabel}
            styles={styles}
          />
        </View>

        {item.photoStatus && item.photoStatus !== 'approved' && (
          <Text
            style={[
              styles.photoStatusText,
              item.photoStatus === 'pending' ? styles.photoStatusPending : styles.photoStatusRejected,
            ]}
            numberOfLines={1}
          >
            {item.photoStatus === 'pending' ? 'Photo awaiting approval' : 'Photo rejected - update needed'}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.category}</Text>
          </View>
          <View style={styles.prep}>
            <Clock size={12} color={theme.colors.secondaryText} />
            <Text style={styles.prepText}>{item.preparationTime} min</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          <View style={styles.toggles}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Available</Text>
              <Switch value={item.isAvailable} onValueChange={onToggleAvailability} />
            </View>
            <TouchableOpacity style={[styles.starButton, item.isPopular && styles.starButtonActive]} onPress={onTogglePopular}>
              <Star size={14} color={item.isPopular ? '#FFFFFF' : theme.colors.secondaryText} fill={item.isPopular ? '#FFFFFF' : 'transparent'} />
              <Text style={[styles.toggleLabel, { color: item.isPopular ? '#FFFFFF' : theme.colors.text }]}>Popular</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
              <Pencil size={14} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
              <Trash2 size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function StatusPill({
  isAvailable,
  isScheduled,
  availabilityLabel,
  styles,
}: {
  isAvailable: boolean;
  isScheduled?: boolean;
  availabilityLabel?: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const badge = deriveAvailabilityBadge({ isAvailable, isScheduled, availabilityLabel });

  if (badge.type === 'unavailable') {
    return (
      <View style={[styles.statusBadge, styles.unavailableBadge]}>
        <Text style={[styles.statusText, styles.unavailableText]}>{badge.label}</Text>
      </View>
    );
  }
  if (badge.type === 'scheduled') {
    return (
      <View style={[styles.statusBadge, styles.scheduledBadge]}>
        <Text style={[styles.statusText, styles.scheduledText]}>{badge.label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.statusBadge, styles.availableBadge]}>
      <Text style={[styles.statusText, styles.availableText]}>{badge.label}</Text>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      marginBottom: theme.spacing.md,
      ...theme.shadows.card,
    },
    highlightCard: { borderColor: theme.colors.accent },
    unavailableCard: { opacity: 0.75 },
    image: { width: 110, height: '100%' },
    body: { flex: 1, padding: theme.spacing.md, gap: theme.spacing.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    name: { ...theme.typography.subhead, flex: 1 },
    description: { ...theme.typography.caption, color: theme.colors.secondaryText, marginTop: 2 },
    badges: { flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' },
    popularBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      gap: 4,
    },
    popularText: { ...theme.typography.caption, color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
    statusBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
    },
    availableBadge: { backgroundColor: `${theme.colors.status.success}22` },
    unavailableBadge: { backgroundColor: `${theme.colors.status.error}22` },
    scheduledBadge: { backgroundColor: `${theme.colors.status.info}22` },
    statusText: { ...theme.typography.caption, fontFamily: 'Inter-SemiBold' },
    availableText: { color: theme.colors.status.success },
    unavailableText: { color: theme.colors.status.error },
    scheduledText: { color: theme.colors.status.info },
    photoStatusText: { ...theme.typography.caption, color: theme.colors.status.warning },
    photoStatusPending: {},
    photoStatusRejected: { color: theme.colors.status.error },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chip: {
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    chipText: { ...theme.typography.caption },
    prep: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    prepText: { ...theme.typography.caption, color: theme.colors.secondaryText },
    footer: { gap: theme.spacing.xs },
    price: { ...theme.typography.subhead },
    toggles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    toggleLabel: { ...theme.typography.caption, color: theme.colors.text },
    starButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    starButtonActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
    actions: { flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButton: { backgroundColor: theme.colors.status.info },
    deleteButton: { backgroundColor: theme.colors.status.error },
  });
}
