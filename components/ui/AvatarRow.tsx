import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, ViewStyle, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type AvatarRowProps = {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  style?: ViewStyle;
};

export default function AvatarRow({ name, subtitle, avatarUrl, onPress, rightContent, style }: AvatarRowProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const initial = name?.[0] || '?';

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      hitSlop={theme.tap.hitSlop}
    >
      <View style={styles.left}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        <View>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.right}>
        {rightContent}
        {onPress ? <ChevronRight size={16} color={theme.colors.secondaryText} /> : null}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    right: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    avatarInitial: { ...theme.typography.subhead, color: theme.colors.text },
    name: { ...theme.typography.subhead, color: theme.colors.text },
    subtitle: { ...theme.typography.caption, color: theme.colors.secondaryText },
  });
}
