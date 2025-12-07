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
}

export default function Header({
  title,
  showBackButton = false,
  rightComponent,
  onBackPress,
}: HeaderProps) {
  const { colors, spacing, radius, typography, tap, iconSizes } = useRestaurantTheme();

  const styles = useMemo(
    () => ({
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      } as ViewStyle,
      backButton: {
        padding: spacing.xs,
        minHeight: tap.minHeight,
      } as ViewStyle,
      title: { ...typography.title2, textAlign: 'center', flex: 1 } as TextStyle,
      placeholder: { width: iconSizes.lg + spacing.xs * 2 } as ViewStyle,
    }),
    [colors.border, colors.surface, iconSizes.lg, spacing.lg, spacing.md, spacing.xs, tap.minHeight, typography.title2]
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
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ArrowLeft size={iconSizes.lg} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.title}>{title}</Text>
      {rightComponent ? rightComponent : <View style={styles.placeholder} />}
    </View>
  );
}
