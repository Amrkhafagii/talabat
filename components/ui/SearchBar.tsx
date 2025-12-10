import React, { useMemo } from 'react';
import { View, TextInput, ViewStyle, TextStyle } from 'react-native';
import { Icon } from './Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  style,
}: SearchBarProps) {
  const { colors, spacing, radius, typography, tap, shadows } = useRestaurantTheme();

  const styles = useMemo(() => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.borderMuted,
      minHeight: tap.minHeight - 4,
      ...shadows.card,
    } as ViewStyle,
    input: {
      flex: 1,
      marginLeft: spacing.sm,
      ...typography.body,
      color: colors.text,
    } as TextStyle,
  }), [colors.borderMuted, colors.surface, colors.text, radius.pill, shadows.card, spacing.lg, spacing.sm, tap.minHeight, typography.body]);

  return (
    <View style={[styles.container, style]}>
      <Icon name="Search" size="lg" color={colors.textSubtle} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.formPlaceholder}
      />
    </View>
  );
}
