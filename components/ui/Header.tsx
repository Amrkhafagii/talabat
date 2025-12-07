import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  rightComponent?: React.ReactNode;
  onBackPress?: () => void;
  subdued?: boolean;
}

export default function Header({
  title,
  showBackButton = false,
  rightComponent,
  onBackPress,
  subdued = false,
}: HeaderProps) {
  const { colors, spacing, radius, typography, tap, iconSizes, insets, icons } = useRestaurantTheme();

  const styles = useMemo(
    () => ({
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md + Math.max(insets.top * 0.35, spacing.sm),
        paddingBottom: spacing.md,
        backgroundColor: subdued ? colors.surfaceAlt : colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      } as ViewStyle,
      backButton: {
        padding: spacing.xs,
        minHeight: tap.minHeight,
        borderRadius: radius.sm,
      } as ViewStyle,
      title: { ...typography.titleL, textAlign: 'center', flex: 1, color: colors.text } as TextStyle,
      placeholder: { width: iconSizes.lg + spacing.xs * 2 } as ViewStyle,
    }),
    [colors.border, colors.surface, colors.surfaceAlt, colors.text, iconSizes.lg, insets.top, radius.sm, spacing.lg, spacing.md, spacing.sm, spacing.xs, subdued, tap.minHeight, typography.titleL]
  );

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      {showBackButton ? (
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton} hitSlop={tap.hitSlop}>
          <ArrowLeft size={iconSizes.lg} strokeWidth={icons.strokeWidth} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {rightComponent ? rightComponent : <View style={styles.placeholder} />}
    </View>
  );
}
