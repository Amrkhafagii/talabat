import React, { memo } from 'react';
import { ColorValue, Insets, Platform, StyleProp, StyleSheet, TouchableNativeFeedback, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Icon, type IconFamily, type IconName, type IconProps } from './Icon';
import { useAppTheme } from '@/styles/appTheme';

type IconButtonProps = {
  name: IconName | string;
  family?: IconFamily;
  size?: IconProps['size'];
  color?: IconProps['color'];
  status?: IconProps['status'];
  onPress?: () => void;
  disabled?: boolean;
  hitSlop?: Insets | number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  allowFontScaling?: boolean;
  testID?: string;
};

export const IconButton = memo(function IconButton({
  name,
  family,
  size = 'md',
  color,
  status,
  onPress,
  disabled,
  hitSlop,
  backgroundColor,
  style,
  accessibilityLabel,
  allowFontScaling,
  testID,
}: IconButtonProps) {
  const theme = useAppTheme();

  const baseStyle: StyleProp<ViewStyle> = [
    styles.button,
    {
      minHeight: theme.tap.minHeight,
      minWidth: theme.tap.minHeight,
      padding: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      backgroundColor: backgroundColor ?? 'transparent',
      opacity: disabled ? 0.5 : 1,
    },
    style,
  ];

  const rippleColor: ColorValue = typeof color === 'string' ? color : theme.colors.overlay;

  const iconNode = (
    <Icon
      name={name}
      family={family}
      size={size}
      color={color}
      status={status}
      allowFontScaling={allowFontScaling}
    />
  );

  if (Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback
        accessibilityLabel={accessibilityLabel ?? `${name} button`}
        accessibilityRole="button"
        disabled={disabled}
        hitSlop={hitSlop ?? theme.tap.hitSlop}
        onPress={onPress}
        background={TouchableNativeFeedback.Ripple(rippleColor, true)}
        useForeground
        testID={testID}
      >
        <View style={[baseStyle, styles.rippleContainer]}>{iconNode}</View>
      </TouchableNativeFeedback>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel ?? `${name} button`}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={hitSlop ?? theme.tap.hitSlop}
      onPress={onPress}
      style={baseStyle}
      testID={testID}
    >
      {iconNode}
    </TouchableOpacity>
  );
});

IconButton.displayName = 'IconButton';

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleContainer: {
    overflow: 'hidden',
  },
});
