import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  SharedValue,
} from 'react-native-reanimated';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface UserTypeOption {
  id: 'customer' | 'restaurant' | 'delivery';
  title: string;
  description: string;
  icon: IconName;
  color: string;
}

interface UserTypeSelectorProps {
  selectedType: 'customer' | 'restaurant' | 'delivery';
  onSelect: (type: 'customer' | 'restaurant' | 'delivery') => void;
}

type AnimationValues = {
  scale: SharedValue<number>;
  elevation: SharedValue<number>;
  borderOpacity: SharedValue<number>;
  iconScale: SharedValue<number>;
  glowOpacity: SharedValue<number>;
};

function hexWithAlpha(hex: string, alpha: number) {
  const cleaned = hex.replace('#', '');
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${cleaned}${a}`;
}

function useOptionAnimations(): AnimationValues {
  return {
    scale: useSharedValue(1),
    elevation: useSharedValue(0),
    borderOpacity: useSharedValue(0),
    iconScale: useSharedValue(1),
    glowOpacity: useSharedValue(0),
  };
}

function UserTypeCard({
  option,
  isSelected,
  animations,
  onPress,
  styles,
  iconSize,
  hitSlop,
}: {
  option: UserTypeOption;
  isSelected: boolean;
  animations: AnimationValues;
  onPress: () => void;
  styles: ReturnType<typeof buildStyles>;
  iconSize: number;
  hitSlop: { top: number; bottom: number; left: number; right: number };
}) {
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animations.scale.value }],
    elevation: animations.elevation.value,
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: animations.borderOpacity.value,
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animations.iconScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: animations.glowOpacity.value,
  }));

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} hitSlop={hitSlop} accessibilityRole="button" accessibilityState={{ selected: isSelected }}>
      <Animated.View
        style={[
          styles.card,
          animatedCardStyle,
          { backgroundColor: isSelected ? hexWithAlpha(option.color, 0.08) : styles.card.backgroundColor },
        ]}
      >
        <Animated.View style={[styles.borderOverlay, animatedBorderStyle, { borderColor: option.color }]} />
        <Animated.View
          style={[
            styles.glowOverlay,
            animatedGlowStyle,
            { backgroundColor: hexWithAlpha(option.color, 0.12) },
          ]}
        />

        <View style={styles.cardContent}>
          <Animated.View
            style={[
              styles.iconContainer,
              animatedIconStyle,
              { backgroundColor: isSelected ? option.color : styles.iconContainer.backgroundColor },
            ]}
          >
            <Icon
              name={option.icon}
              size={iconSize}
              color={isSelected ? styles.textInverse : styles.iconColor}
            />
          </Animated.View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: isSelected ? option.color : styles.title.color }]}>{option.title}</Text>
            <Text style={styles.description}>{option.description}</Text>
          </View>

          {isSelected && (
            <Animated.View style={[styles.selectionIndicator, { backgroundColor: option.color }]}>
              <Text style={styles.checkmark}>✓</Text>
            </Animated.View>
          )}
        </View>

        <Animated.View
          style={[
            styles.rippleEffect,
            animatedGlowStyle,
            { backgroundColor: hexWithAlpha(option.color, 0.08) },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

type SelectorStyles = {
  container: ViewStyle;
  card: ViewStyle;
  borderOverlay: ViewStyle;
  glowOverlay: ViewStyle;
  cardContent: ViewStyle;
  iconContainer: ViewStyle;
  iconColor: string;
  textContainer: ViewStyle;
  title: TextStyle;
  description: TextStyle;
  selectionIndicator: ViewStyle;
  checkmark: TextStyle;
  rippleEffect: ViewStyle;
  hitSlop: { top: number; bottom: number; left: number; right: number };
  textInverse: string;
};

function buildStyles(theme: ReturnType<typeof useRestaurantTheme>): SelectorStyles {
  const { colors, spacing, radius, typography, shadows, tap } = theme;

  return {
    container: { gap: spacing.md },
    card: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      position: 'relative',
      overflow: 'hidden',
      ...shadows.card,
    },
    borderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius.xl,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    glowOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius.xl,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
      zIndex: 1,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.pill,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
      backgroundColor: colors.surfaceAlt,
      ...shadows.card,
    },
    iconColor: colors.mutedText || colors.textSubtle,
    textInverse: colors.textInverse,
    textContainer: { flex: 1 },
    title: { ...(typography.title2 || typography.titleM), marginBottom: spacing.xs },
    description: { ...typography.body, color: colors.secondaryText || colors.textMuted, lineHeight: 20 },
    selectionIndicator: {
      width: 28,
      height: 28,
      borderRadius: theme.radius.pill,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.card,
    },
    checkmark: { color: colors.textInverse, fontSize: 16, fontFamily: 'Inter-Bold' },
    rippleEffect: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius.xl,
    },
    hitSlop: tap.hitSlop,
  };
}

export default function UserTypeSelector({ selectedType, onSelect }: UserTypeSelectorProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const iconSize = theme.iconSizes.lg;
  const animationValues = {
    customer: useOptionAnimations(),
    restaurant: useOptionAnimations(),
    delivery: useOptionAnimations(),
  };

  const options: UserTypeOption[] = useMemo(
    () => [
      {
        id: 'customer',
        title: 'Customer',
        description: 'Order delicious food from your favorite restaurants',
        icon: 'User',
        color: theme.colors.status.info,
      },
      {
        id: 'restaurant',
        title: 'Restaurant',
        description: 'Manage your restaurant, menu, and incoming orders',
        icon: 'Store',
        color: theme.colors.accent,
      },
      {
        id: 'delivery',
        title: 'Delivery Driver',
        description: 'Deliver food to customers and earn money on your schedule',
        icon: 'Truck',
        color: theme.colors.status.warning,
      },
    ],
    [theme.colors.accent, theme.colors.status.info, theme.colors.status.warning]
  );

  const animateCardSelection = (cardId: string, isSelected: boolean) => {
    const animations = animationValues[cardId as keyof typeof animationValues];
    if (!animations) return;

    if (isSelected) {
      animations.scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1.02, { damping: 15, stiffness: 300 }),
        withTiming(1, { duration: 150 })
      );
      animations.iconScale.value = withSequence(withTiming(1.2, { duration: 200 }), withTiming(1, { duration: 200 }));
      animations.glowOpacity.value = withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 500 }));
      animations.elevation.value = withTiming(8, { duration: 200 });
      animations.borderOpacity.value = withTiming(1, { duration: 200 });
    } else {
      animations.scale.value = withTiming(1, { duration: 200 });
      animations.elevation.value = withTiming(0, { duration: 200 });
      animations.borderOpacity.value = withTiming(0, { duration: 200 });
      animations.iconScale.value = withTiming(1, { duration: 200 });
    }
  };

  const handleCardPress = (option: UserTypeOption) => {
    options.forEach(opt => {
      animateCardSelection(opt.id, opt.id === option.id);
    });
    onSelect(option.id);
  };

  useEffect(() => {
    options.forEach(option => {
      animateCardSelection(option.id, option.id === selectedType);
    });
  }, [options, selectedType]);

  return (
    <View style={styles.container}>
      {options.map(option => (
        <UserTypeCard
          key={option.id}
          option={option}
          isSelected={selectedType === option.id}
          animations={animationValues[option.id]}
          onPress={() => handleCardPress(option)}
          styles={styles}
          iconSize={iconSize}
          hitSlop={styles.hitSlop}
        />
      ))}
    </View>
  );
}
