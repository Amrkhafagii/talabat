import React, { useMemo } from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { IconButton } from './IconButton';

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
  const { colors, spacing, radius, typography, tap, iconSizes, insets, shadows } = useRestaurantTheme();

  const styles = useMemo(
    () => ({
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md + Math.max(insets.top * 0.5, spacing.sm),
        paddingBottom: spacing.md,
        backgroundColor: subdued ? colors.surfaceAlt : colors.surfaceStrong,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderMuted,
        ...(subdued ? {} : shadows.card),
      } as ViewStyle,
      backButton: {
        padding: spacing.xs,
        minHeight: tap.minHeight,
        borderRadius: radius.md,
      } as ViewStyle,
      title: { ...typography.titleM, textAlign: 'center', flex: 1, color: colors.text } as TextStyle,
      placeholder: { width: iconSizes.lg + spacing.xs * 2 } as ViewStyle,
    }),
    [colors.borderMuted, colors.surfaceAlt, colors.surfaceStrong, colors.text, iconSizes.lg, insets.top, radius.md, shadows.card, spacing.md, spacing.sm, spacing.xl, spacing.xs, subdued, tap.minHeight, typography.titleM]
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
        <IconButton
          name="ArrowLeft"
          onPress={handleBackPress}
          hitSlop={tap.hitSlop}
          size="lg"
          color={colors.text}
          style={styles.backButton}
        />
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
