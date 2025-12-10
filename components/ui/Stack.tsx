import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { useAppTheme } from '@/styles/appTheme';

type SpacingKey = keyof ReturnType<typeof useAppTheme>['spacing'];

type StackProps = ViewProps & {
  gap?: SpacingKey | number;
  direction?: 'row' | 'column';
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  divider?: boolean;
  dividerColor?: string;
  dividerSpacing?: SpacingKey | number;
  dividerThickness?: number;
};

function resolveSpace(theme: ReturnType<typeof useAppTheme>, value?: SpacingKey | number, fallback: SpacingKey = 'sm') {
  if (typeof value === 'number') return value;
  return theme.spacing[value ?? fallback] ?? theme.spacing[fallback];
}

export function Stack({
  gap = 'sm',
  direction = 'column',
  align = 'flex-start',
  justify = 'flex-start',
  divider = false,
  dividerColor,
  dividerSpacing = 'sm',
  dividerThickness = 1,
  style,
  children,
  ...rest
}: StackProps) {
  const theme = useAppTheme();
  const resolvedGap = resolveSpace(theme, gap);
  const resolvedDividerSpacing = resolveSpace(theme, dividerSpacing, 'xs');
  const childrenArray = React.Children.toArray(children);
  const dividerStyle: ViewStyle = {
    width: direction === 'row' ? dividerThickness : '100%',
    height: direction === 'row' ? '100%' : dividerThickness,
    backgroundColor: dividerColor ?? theme.colors.borderMuted,
    borderRadius: theme.radius.sm,
  };

  const content = divider
    ? childrenArray.map((child, idx) => {
        const isLast = idx === childrenArray.length - 1;
        return (
          <React.Fragment key={idx}>
            {child}
            {!isLast ? <View style={[dividerStyle, { marginHorizontal: direction === 'row' ? resolvedDividerSpacing : 0, marginVertical: direction === 'column' ? resolvedDividerSpacing : 0 }]} /> : null}
          </React.Fragment>
        );
      })
    : childrenArray;

  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: direction,
          alignItems: align,
          justifyContent: justify,
          gap: resolvedGap,
        },
        style,
      ]}
    >
      {content}
    </View>
  );
}

export function HStack(props: Omit<StackProps, 'direction'>) {
  return <Stack {...props} direction="row" />;
}

export function VStack(props: Omit<StackProps, 'direction'>) {
  return <Stack {...props} direction="column" />;
}

export function Spacer({ size = 'sm', direction = 'vertical' }: { size?: SpacingKey | number; direction?: 'horizontal' | 'vertical' }) {
  const theme = useAppTheme();
  const resolved = resolveSpace(theme, size);
  return <View style={direction === 'horizontal' ? { width: resolved } : { height: resolved }} />;
}

export function Divider({
  color,
  thickness = 1,
  inset = 0,
  orientation = 'horizontal',
}: {
  color?: string;
  thickness?: number;
  inset?: SpacingKey | number;
  orientation?: 'horizontal' | 'vertical';
}) {
  const theme = useAppTheme();
  const insetValue = resolveSpace(theme, inset, 'sm');

  const style: ViewStyle =
    orientation === 'horizontal'
      ? { height: thickness, backgroundColor: color ?? theme.colors.borderMuted, marginHorizontal: insetValue, borderRadius: theme.radius.sm }
      : { width: thickness, backgroundColor: color ?? theme.colors.borderMuted, marginVertical: insetValue, borderRadius: theme.radius.sm };

  return <View style={style} />;
}
