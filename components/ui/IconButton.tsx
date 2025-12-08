import React, { memo } from 'react';
import { Insets, Pressable, PressableStateCallbackType, StyleProp, StyleSheet, ViewStyle } from 'react-native';
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

  const pressableStyle = ({ pressed }: PressableStateCallbackType) => [
    styles.button,
    {
      minHeight: theme.tap.minHeight,
      minWidth: theme.tap.minHeight,
      padding: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      backgroundColor: backgroundColor ?? 'transparent',
      opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
    },
    style,
  ];

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? `${name} button`}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={hitSlop ?? theme.tap.hitSlop}
      onPress={onPress}
      style={pressableStyle}
      testID={testID}
    >
      <Icon
        name={name}
        family={family}
        size={size}
        color={color}
        status={status}
        allowFontScaling={allowFontScaling}
      />
    </Pressable>
  );
});

IconButton.displayName = 'IconButton';

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
