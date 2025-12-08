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
  const { colors, spacing, radius, typography, tap } = useRestaurantTheme();

  const styles = useMemo(() => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.formSurfaceAlt,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.formBorder,
      minHeight: tap.minHeight - 4,
    } as ViewStyle,
    input: {
      flex: 1,
      marginLeft: spacing.sm,
      ...typography.body,
      color: colors.text,
    } as TextStyle,
  }), [colors.formBorder, colors.formSurfaceAlt, colors.text, radius.md, spacing.md, spacing.sm, tap.minHeight, typography.body]);

  return (
    <View style={[styles.container, style]}>
      <Icon name="Search" size="md" color={colors.mutedText} />
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
