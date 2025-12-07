import React, { useMemo } from 'react';
import { View, TextInput, ViewStyle, TextStyle } from 'react-native';
import { Search } from 'lucide-react-native';
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
  const { colors, spacing, radius, typography, shadows, tap } = useRestaurantTheme();

  const styles = useMemo(() => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.card ?? {}),
      minHeight: tap.minHeight,
    } as ViewStyle,
    input: {
      flex: 1,
      marginLeft: spacing.sm,
      ...typography.body,
      color: colors.text,
    } as TextStyle,
  }), [colors.border, colors.surfaceAlt, colors.text, radius.lg, shadows.card, spacing.md, spacing.sm, tap.minHeight, typography.body]);

  return (
    <View style={[styles.container, style]}>
      <Search size={20} color={colors.mutedText} />
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
